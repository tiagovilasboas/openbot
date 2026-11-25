import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import { DEFAULT_THREAD_ID } from "../../threads/thread-model.ts";
import { decideThreadLoad } from "./conversations-load-decision.ts";
import type {
  ConversationsApi,
  SyncFailure,
} from "./conversations-sync-types.ts";

export interface LoadDeps {
  api: ConversationsApi;
  /** The bots whose threads are loaded. */
  botIds(): string[];
  /** The threads this browser lists for a bot; the default when absent. */
  threadIds?(botId: string): string[];
  /** The cached thread; the same array while it has not changed. */
  readLocal(botId: string, threadId: string): MessageData[];
  isUnsynced(botId: string, threadId: string): boolean;
  setUnsynced(botId: string, value: boolean, threadId: string): void;
  /** Makes the cache match the server, without sending anything back. */
  mirror(botId: string, messages: MessageData[], threadId: string): void;
  reportFailure(failure: SyncFailure): void;
}

/** Loads one thread; false when something could not be delivered or read. */
async function loadThread(
  deps: LoadDeps,
  botId: string,
  threadId: string,
): Promise<void> {
  const unsynced = deps.isUnsynced(botId, threadId);
  const before = deps.readLocal(botId, threadId);
  const server = await deps.api.get(botId, threadId);
  const local = deps.readLocal(botId, threadId);
  // The user saved while the request was out: that newer thread is already
  // queued for the server, and mirroring would overwrite it.
  if (local !== before) return;

  const decision = decideThreadLoad({ server, local, unsynced });
  if (decision.action === "use-server") {
    deps.mirror(botId, decision.messages, threadId);
    return;
  }
  if (decision.action === "import") {
    const result = await deps.api.put(botId, decision.messages, threadId);
    if (result.ok) deps.setUnsynced(botId, false, threadId);
    else {
      deps.reportFailure(result.failure);
      deps.setUnsynced(botId, true, threadId);
    }
    return;
  }
  // An unreachable server leaves the browser's thread undelivered.
  if (!server.ok && local.length > 0) {
    deps.setUnsynced(botId, true, threadId);
  }
}

/**
 * The first load of the conversations, after the bots: the server is the
 * source of truth and the browser's copy is a cache. Whatever cannot be
 * delivered stays marked unsynced, so the next load tries again.
 */
export async function syncConversationsOnLoad(deps: LoadDeps): Promise<void> {
  await Promise.all(
    deps.botIds().flatMap((botId) => {
      const extras = deps.threadIds?.(botId) ?? [];
      const threadIds = new Set([DEFAULT_THREAD_ID, ...extras]);
      return [...threadIds].map((threadId) =>
        loadThread(deps, botId, threadId),
      );
    }),
  );
}
