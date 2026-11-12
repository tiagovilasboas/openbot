import type { SyncFailure } from "../../conversations/sync/conversations-sync-types.ts";
import type { UsageRecord } from "../usage-record.ts";
import type { UsageApi, UsageResult } from "./usage-sync-types.ts";

export type UsageLoadDecision =
  | { action: "use-server"; records: UsageRecord[] }
  | { action: "import"; records: UsageRecord[] }
  | { action: "keep-local" };

/**
 * What the first load does with the log. The server is the source of truth,
 * except when it cannot be reached or when this browser holds a change it
 * never delivered (an emptied log included). An empty server takes the
 * browser's log.
 */
export function decideUsageLoad(input: {
  server: UsageResult;
  local: readonly UsageRecord[];
  unsynced: boolean;
}): UsageLoadDecision {
  const { server, local, unsynced } = input;
  if (!server.ok) return { action: "keep-local" };
  if (unsynced) return { action: "import", records: [...local] };
  if (server.records.length > 0) {
    const same = JSON.stringify(server.records) === JSON.stringify(local);
    return same
      ? { action: "keep-local" }
      : { action: "use-server", records: server.records };
  }
  if (local.length > 0) return { action: "import", records: [...local] };
  return { action: "keep-local" };
}

export interface UsageLoadDeps {
  api: UsageApi;
  /** The cached log; the same array while it has not changed. */
  readLocal(): UsageRecord[];
  isUnsynced(): boolean;
  setUnsynced(value: boolean): void;
  /** Makes the cache match the server, without sending anything back. */
  mirror(records: UsageRecord[]): void;
  reportFailure(failure: SyncFailure): void;
}

/**
 * The first load of the usage log: the server is the source of truth and the
 * browser's copy is a cache. Whatever cannot be delivered stays marked
 * unsynced, so the next load tries again.
 */
export async function syncUsageOnLoad(deps: UsageLoadDeps): Promise<void> {
  const unsynced = deps.isUnsynced();
  const before = deps.readLocal();
  const server = await deps.api.get();
  const local = deps.readLocal();
  // Counting went on while the request was out: that newer log is already
  // queued for the server, and mirroring would overwrite it.
  if (local !== before) return;

  const decision = decideUsageLoad({ server, local, unsynced });
  if (decision.action === "use-server") {
    deps.mirror(decision.records);
    return;
  }
  if (decision.action === "import") {
    const result = await deps.api.put(decision.records);
    if (result.ok) deps.setUnsynced(false);
    else {
      deps.reportFailure(result.failure);
      deps.setUnsynced(true);
    }
    return;
  }
  // An unreachable server leaves the browser's log undelivered.
  if (!server.ok && local.length > 0) deps.setUnsynced(true);
}
