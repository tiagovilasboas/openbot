import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import { decideThreadLoad } from "./conversations-load-decision.ts";
import type {
  ConversationsApi,
  SyncFailure,
} from "./conversations-sync-types.ts";

export interface LoadDeps {
  api: ConversationsApi;
  /** The bots whose threads are loaded. */
  botIds(): string[];
  /** The cached thread; the same array while it has not changed. */
  readLocal(botId: string): MessageData[];
  isUnsynced(botId: string): boolean;
  setUnsynced(botId: string, value: boolean): void;
  /** Makes the cache match the server, without sending anything back. */
  mirror(botId: string, messages: MessageData[]): void;
  reportFailure(failure: SyncFailure): void;
}

/** Loads one thread; false when something could not be delivered or read. */
async function loadThread(deps: LoadDeps, botId: string): Promise<void> {
  const unsynced = deps.isUnsynced(botId);
  const before = deps.readLocal(botId);
  const server = await deps.api.get(botId);
  const local = deps.readLocal(botId);
  // The user saved while the request was out: that newer thread is already
  // queued for the server, and mirroring would overwrite it.
  if (local !== before) return;

  const decision = decideThreadLoad({ server, local, unsynced });
  if (decision.action === "use-server") {
    deps.mirror(botId, decision.messages);
    return;
  }
  if (decision.action === "import") {
    const result = await deps.api.put(botId, decision.messages);
    if (result.ok) deps.setUnsynced(botId, false);
    else {
      deps.reportFailure(result.failure);
      deps.setUnsynced(botId, true);
    }
    return;
  }
  // An unreachable server leaves the browser's thread undelivered.
  if (!server.ok && local.length > 0) deps.setUnsynced(botId, true);
}

/**
 * The first load of the conversations, after the bots: the server is the
 * source of truth and the browser's copy is a cache. Whatever cannot be
 * delivered stays marked unsynced, so the next load tries again.
 */
export async function syncConversationsOnLoad(deps: LoadDeps): Promise<void> {
  await Promise.all(deps.botIds().map((botId) => loadThread(deps, botId)));
}
