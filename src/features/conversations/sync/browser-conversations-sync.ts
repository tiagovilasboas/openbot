import { loadThreads } from "../../threads/thread-storage.ts";
import { loadBotsFromStorage } from "../../bots/bot-storage.ts";
import type { MessagesSyncPort } from "../../chat/messages-sync-port.ts";
import {
  loadBotMessages,
  saveBotMessages,
} from "../../chat/use-bot-messages.ts";
import { createConversationsApi } from "./conversations-api.ts";
import { createResync } from "./conversations-resync.ts";
import { createConversationsPutQueue } from "./conversations-put-queue.ts";
import {
  conversationsSyncErrorCode,
  type ConversationsSyncErrorCode,
} from "./conversations-sync-failure.ts";
import type { SyncFailure, WriteResult } from "./conversations-sync-types.ts";
import {
  isMessagesUnsynced,
  setMessagesUnsynced,
} from "./local-conversations-port.ts";
import { syncConversationsOnLoad } from "./sync-conversations-on-load.ts";

/** The browser's wiring of the conversation sync: real fetch and storage. */

type ErrorListener = (code: ConversationsSyncErrorCode) => void;
let errorListeners: ErrorListener[] = [];

export function subscribeConversationsSyncErrors(
  listener: ErrorListener,
): () => void {
  errorListeners.push(listener);
  return () => {
    errorListeners = errorListeners.filter((l) => l !== listener);
  };
}

function report(failure: SyncFailure): void {
  const code = conversationsSyncErrorCode(failure);
  if (code) errorListeners.forEach((listener) => listener(code));
}

const storage = (): Storage => window.localStorage;
const api = createConversationsApi();

const queue = createConversationsPutQueue({
  send: (botId, op, threadId) =>
    op.kind === "delete"
      ? api.remove(botId, threadId)
      : api.put(botId, op.messages, threadId),
  onResult: (botId, result: WriteResult, settled, threadId) => {
    if (!result.ok) report(result.failure);
    else if (settled) setMessagesUnsynced(storage(), botId, false, threadId);
  },
});

/** What the thread cache calls on every save and every forget. */
export const browserMessagesSyncPort: MessagesSyncPort = {
  saved(botId, messages, threadId) {
    setMessagesUnsynced(storage(), botId, true, threadId);
    queue.put(botId, messages, threadId);
  },
  forgotten(botId, threadId) {
    setMessagesUnsynced(storage(), botId, true, threadId);
    queue.remove(botId, threadId);
  },
};

const resync = createResync({
  now: () => Date.now(),
  load: () =>
    syncConversationsOnLoad({
      api,
      botIds: () => loadBotsFromStorage().map((bot) => bot.id),
      threadIds: (botId) => loadThreads(botId).map((thread) => thread.id),
      readLocal: (botId, threadId) => loadBotMessages(botId, threadId),
      isUnsynced: (botId, threadId) =>
        isMessagesUnsynced(storage(), botId, threadId),
      setUnsynced: (botId, value, threadId) =>
        setMessagesUnsynced(storage(), botId, value, threadId),
      mirror: (botId, messages, threadId) =>
        saveBotMessages(botId, messages, { sync: false, threadId }),
      reportFailure: report,
    }).catch(() => {
      // Loading never throws: the cache is used as it is.
    }),
});

/** Loads every bot's thread; shares a load already in flight. */
export function loadConversationsFromServer(): Promise<void> {
  return resync.first();
}

/** Reloads on return to the tab; throttled, never concurrent. */
export function resyncConversationsFromServer(): boolean {
  return resync.trigger();
}
