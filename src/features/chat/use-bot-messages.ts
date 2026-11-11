"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { MessageData } from "./ChatMessageItem.tsx";
import {
  keySuffixes,
  type KeyListingStorage,
} from "../../shared/storage/key-suffixes.ts";
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
  return () => {
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) {
      messageListeners.delete(botId);
    }
  };
}

/** One key per bot; the crew room steps live inside these messages. */
export const MESSAGES_KEY_PREFIX = "openbot_msgs_";

/** The bot ids that have a thread saved, for pruning the ones that are gone. */
export function storedMessageBotIds(
  storage: KeyListingStorage | undefined = typeof window !== "undefined"
    ? window.localStorage
    : undefined,
): string[] {
  return keySuffixes(storage, MESSAGES_KEY_PREFIX);
}

/** Forgets a bot's whole thread, for example when the bot is deleted. */
export function forgetBotMessages(
  botId: string,
  storage: Pick<Storage, "removeItem"> | undefined = typeof window !==
  "undefined"
    ? window.localStorage
    : undefined,
): void {
  try {
    storage?.removeItem(MESSAGES_KEY_PREFIX + botId);
    cachedMessages.delete(botId);
    messageListeners.get(botId)?.forEach((l) => l());
  } catch {
    // Blocked storage: the thread then stays until it can be removed.
  }
}

export function loadBotMessages(botId: string): MessageData[] {
  if (typeof window === "undefined") return EMPTY_MESSAGES;
  try {
    const raw = window.localStorage.getItem(MESSAGES_KEY_PREFIX + botId);
    const cached = cachedMessages.get(botId);
    if (!raw) {
      if (cached && cached.raw === null) return cached.data;
      const initial = { raw: null, data: EMPTY_MESSAGES };
      cachedMessages.set(botId, initial);
      return EMPTY_MESSAGES;
    }
    if (cached && cached.raw === raw) {
      return cached.data;
    }
    if (raw.length > STORED_MESSAGES_MAX_RAW) return EMPTY_MESSAGES;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const data = sanitizeStoredMessages(parsed);
      cachedMessages.set(botId, { raw, data });
      return data;
    }
  } catch {
    // ignore
  }
  return EMPTY_MESSAGES;
}

export function saveBotMessages(botId: string, messages: MessageData[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(messages);
    window.localStorage.setItem(MESSAGES_KEY_PREFIX + botId, raw);
    cachedMessages.set(botId, { raw, data: messages });
    const listeners = messageListeners.get(botId);
    listeners?.forEach((l) => l());
  } catch {
    // ignore
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
