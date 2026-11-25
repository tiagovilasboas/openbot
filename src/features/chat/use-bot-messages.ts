"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { MessageData } from "./ChatMessageItem.tsx";
import {
  keySuffixes,
  type KeyListingStorage,
} from "../../shared/storage/key-suffixes.ts";
import {
  THREADS_KEY_PREFIX,
  THREAD_KEY_SEPARATOR,
  botIdOfStorageId,
  isDefaultThread,
  messageStorageId,
} from "../threads/thread-model.ts";
import {
  selectedThreadId,
  subscribeThreadSelection,
} from "../threads/thread-selection.ts";
import { currentMessagesSync } from "./messages-sync-port.ts";
import {
  STORED_MESSAGES_MAX_RAW,
  sanitizeStoredMessages,
} from "./stored-message.ts";

const EMPTY_MESSAGES: MessageData[] = [];
const messageListeners = new Map<string, Set<() => void>>();
const cachedMessages = new Map<
  string,
  { raw: string | null; data: MessageData[] }
>();

export function subscribeBotMessages(
  botId: string,
  listener: () => void,
): () => void {
  let listeners = messageListeners.get(botId);
  if (!listeners) {
    listeners = new Set();
    messageListeners.set(botId, listeners);
  }
  listeners.add(listener);
  // Choosing another thread of the bot changes what its messages are.
  const unselect = subscribeThreadSelection(listener);
  return () => {
    unselect();
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) {
      messageListeners.delete(botId);
    }
  };
}

/** One key per bot; the crew room steps live inside these messages. */
export const MESSAGES_KEY_PREFIX = "openbot_msgs_";

/**
 * One key per thread: the default thread keeps the bot-id key, so threads
 * saved before there were several stay where they are.
 */
function keyFor(botId: string, threadId: string): string {
  return MESSAGES_KEY_PREFIX + messageStorageId(botId, threadId);
}

/** The bot ids that have a thread saved, for pruning the ones that are gone. */
export function storedMessageBotIds(
  storage: KeyListingStorage | undefined = typeof window !== "undefined"
    ? window.localStorage
    : undefined,
): string[] {
  return [
    ...new Set(keySuffixes(storage, MESSAGES_KEY_PREFIX).map(botIdOfStorageId)),
  ];
}

/** Forgets all of a bot's threads, for example when the bot is deleted. */
export function forgetBotMessages(
  botId: string,
  storage: Pick<Storage, "removeItem"> | undefined = typeof window !==
  "undefined"
    ? window.localStorage
    : undefined,
): void {
  const extraThreadIds: string[] = [];
  try {
    const prefix = MESSAGES_KEY_PREFIX + botId + THREAD_KEY_SEPARATOR;
    for (const suffix of keySuffixes(
      storage as unknown as KeyListingStorage,
      prefix,
    )) {
      extraThreadIds.push(suffix);
      storage?.removeItem(prefix + suffix);
      cachedMessages.delete(botId + THREAD_KEY_SEPARATOR + suffix);
    }
    storage?.removeItem(THREADS_KEY_PREFIX + botId);
    storage?.removeItem(MESSAGES_KEY_PREFIX + botId);
    cachedMessages.delete(botId);
    messageListeners.get(botId)?.forEach((l) => l());
  } catch {
    // Blocked storage: the thread then stays until it can be removed.
  }
  const sync = currentMessagesSync();
  sync?.forgotten(botId);
  for (const threadId of extraThreadIds) sync?.forgotten(botId, threadId);
}

/** Drops one extra thread's messages; the default thread is never dropped. */
export function forgetThreadMessages(botId: string, threadId: string): void {
  if (typeof window === "undefined" || isDefaultThread(threadId)) return;
  try {
    window.localStorage.removeItem(keyFor(botId, threadId));
    cachedMessages.delete(messageStorageId(botId, threadId));
  } catch {
    // Blocked storage: the thread then stays until it can be removed.
  }
  // Even with blocked storage the server copy can still be dropped.
  currentMessagesSync()?.forgotten(botId, threadId);
}

/** A thread's messages: the one the chat shows, unless another is named. */
export function loadBotMessages(
  botId: string,
  threadId: string = selectedThreadId(botId),
): MessageData[] {
  if (typeof window === "undefined") return EMPTY_MESSAGES;
  const slot = messageStorageId(botId, threadId);
  try {
    const raw = window.localStorage.getItem(keyFor(botId, threadId));
    const cached = cachedMessages.get(slot);
    if (!raw) {
      if (cached && cached.raw === null) return cached.data;
      const initial = { raw: null, data: EMPTY_MESSAGES };
      cachedMessages.set(slot, initial);
      return EMPTY_MESSAGES;
    }
    if (cached && cached.raw === raw) {
      return cached.data;
    }
    if (raw.length > STORED_MESSAGES_MAX_RAW) return EMPTY_MESSAGES;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const data = sanitizeStoredMessages(parsed);
      cachedMessages.set(slot, { raw, data });
      return data;
    }
  } catch {
    // ignore
  }
  return EMPTY_MESSAGES;
}

/**
 * Saves a thread in the cache and queues it for the server. The load passes
 * `sync: false` to mirror what the server holds without sending it back.
 * Every thread is synced under its own id.
 */
export function saveBotMessages(
  botId: string,
  messages: MessageData[],
  options: { sync?: boolean; threadId?: string } = {},
): void {
  if (typeof window === "undefined") return;
  const threadId = options.threadId ?? selectedThreadId(botId);
  try {
    const raw = JSON.stringify(messages);
    window.localStorage.setItem(keyFor(botId, threadId), raw);
    cachedMessages.set(messageStorageId(botId, threadId), {
      raw,
      data: messages,
    });
    const listeners = messageListeners.get(botId);
    listeners?.forEach((l) => l());
  } catch {
    // ignore
  }
  // Even with blocked storage the server copy can still be kept.
  if (options.sync !== false) {
    currentMessagesSync()?.saved(botId, messages, threadId);
  }
}

const getServerSnapshot = () => EMPTY_MESSAGES;

export function useBotMessages(botId: string) {
  const subscribe = useCallback(
    (listener: () => void) => subscribeBotMessages(botId, listener),
    [botId],
  );

  const getSnapshot = useCallback(() => loadBotMessages(botId), [botId]);

  const messages = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const persistMessages = useCallback(
    (nextMessages: MessageData[]) => {
      saveBotMessages(botId, nextMessages);
    },
    [botId],
  );

  // A turn asks for the user id and, after an await, the reply id from the
  // same render's closure, so `messages` alone would hand out the same id
  // twice. The ref keeps ids increasing across calls.
  const lastIssuedIdRef = useRef(0);
  const getNextId = useCallback((): number => {
    const currentMax = messages.reduce((max, m) => Math.max(max, m.id || 0), 0);
    const next = Math.max(currentMax, lastIssuedIdRef.current) + 1;
    lastIssuedIdRef.current = next;
    return next;
  }, [messages]);

  const clearMessages = useCallback(() => {
    persistMessages([]);
  }, [persistMessages]);

  return {
    messages,
    persistMessages,
    getNextId,
    clearMessages,
  };
}
