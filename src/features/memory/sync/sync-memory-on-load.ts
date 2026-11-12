import type { SyncFailure } from "../../conversations/sync/conversations-sync-types.ts";
import type { MemoryEntry } from "../memory-entries.ts";
import { decideNotesLoad } from "./memory-load-decision.ts";
import type { MemoryApi } from "./memory-sync-types.ts";

export interface MemoryLoadDeps {
  api: MemoryApi;
  /** The bots whose notes are loaded. */
  botIds(): string[];
  /** The cached notes; the same array while they have not changed. */
  readLocal(botId: string): MemoryEntry[];
  isUnsynced(botId: string): boolean;
  setUnsynced(botId: string, value: boolean): void;
  /** Makes the cache match the server, without sending anything back. */
  mirror(botId: string, entries: MemoryEntry[]): void;
  reportFailure(failure: SyncFailure): void;
}

async function loadNotes(deps: MemoryLoadDeps, botId: string): Promise<void> {
  const unsynced = deps.isUnsynced(botId);
  const before = deps.readLocal(botId);
  const server = await deps.api.get(botId);
  const local = deps.readLocal(botId);
  // The user saved while the request was out: those newer notes are already
  // queued for the server, and mirroring would overwrite them.
  if (local !== before) return;

  const decision = decideNotesLoad({ server, local, unsynced });
  if (decision.action === "use-server") {
    deps.mirror(botId, decision.entries);
    return;
  }
  if (decision.action === "import") {
    const result = await deps.api.put(botId, decision.entries);
    if (result.ok) deps.setUnsynced(botId, false);
    else {
      deps.reportFailure(result.failure);
      deps.setUnsynced(botId, true);
    }
    return;
  }
  // An unreachable server leaves the browser's notes undelivered.
  if (!server.ok && local.length > 0) deps.setUnsynced(botId, true);
}

/**
 * The first load of the notes, after the bots: the server is the source of
 * truth and the browser's copy is a cache. Whatever cannot be delivered
 * stays marked unsynced, so the next load tries again.
 */
export async function syncMemoryOnLoad(deps: MemoryLoadDeps): Promise<void> {
  await Promise.all(deps.botIds().map((botId) => loadNotes(deps, botId)));
}
