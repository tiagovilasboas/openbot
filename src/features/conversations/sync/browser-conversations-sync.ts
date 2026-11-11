import { loadBotsFromStorage } from "../../bots/bot-storage.ts";
import type { MessagesSyncPort } from "../../chat/messages-sync-port.ts";
import {
  loadBotMessages,
  saveBotMessages,
} from "../../chat/use-bot-messages.ts";
import { createConversationsApi } from "./conversations-api.ts";
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
  send: (botId, op) =>
    op.kind === "delete" ? api.remove(botId) : api.put(botId, op.messages),
  onResult: (botId, result: WriteResult, settled) => {
    if (!result.ok) report(result.failure);
    else if (settled) setMessagesUnsynced(storage(), botId, false);
  },
});

/** What the thread cache calls on every save and every forget. */
export const browserMessagesSyncPort: MessagesSyncPort = {
  saved(botId, messages) {
    setMessagesUnsynced(storage(), botId, true);
    queue.put(botId, messages);
  },
  forgotten(botId) {
    setMessagesUnsynced(storage(), botId, true);
    queue.remove(botId);
  },
};

let loading: Promise<void> | null = null;

/** Loads every bot's thread once per page; safe to call repeatedly. */
export function loadConversationsFromServer(): Promise<void> {
  loading ??= syncConversationsOnLoad({
    api,
    botIds: () => loadBotsFromStorage().map((bot) => bot.id),
    readLocal: loadBotMessages,
    isUnsynced: (botId) => isMessagesUnsynced(storage(), botId),
    setUnsynced: (botId, value) => setMessagesUnsynced(storage(), botId, value),
    mirror: (botId, messages) =>
      saveBotMessages(botId, messages, { sync: false }),
    reportFailure: report,
  }).catch(() => {
    // Loading never throws: the cache is used as it is.
  });
  return loading;
}
