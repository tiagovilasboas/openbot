"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { NEW_CHAT_UNDO_WINDOW_MS } from "../chat/new-chat-undo.ts";
import type { MessageData } from "../chat/ChatMessageItem.tsx";
import { branchThread, branchTitle } from "../chat/branch-thread.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import {
  forgetThreadMessages,
  loadBotMessages,
  saveBotMessages,
} from "../chat/use-bot-messages.ts";
import {
  DEFAULT_THREAD_ID,
  newThread,
  removeThread,
  renameThread,
  resolveThreadId,
  type Thread,
} from "./thread-model.ts";
import {
  selectedThreadId,
  selectThread,
  subscribeThreadSelection,
} from "./thread-selection.ts";
import {
  loadThreads,
  saveThreads,
  subscribeThreads,
} from "./thread-storage.ts";
import { displayTitle, getThreadCopy } from "./thread-copy.ts";

interface RemovedThread {
  botId: string;
  thread: Thread;
  messages: MessageData[];
}

function freshThreadId(): string {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY: Thread[] = [];

/** A bot's threads: list, switch, create, rename, delete with undo, branch. */
export function useBotThreads(botId: string, language: ChatLanguage) {
  const threads = useSyncExternalStore(
    useCallback((l) => subscribeThreads(botId, l), [botId]),
    () => loadThreads(botId),
    () => EMPTY,
  );
  const wanted = useSyncExternalStore(
    subscribeThreadSelection,
    () => selectedThreadId(botId),
    () => DEFAULT_THREAD_ID,
  );
  const activeId = resolveThreadId(threads, wanted);
  const [removed, setRemoved] = useState<RemovedThread | null>(null);

  // A thread that is gone (deleted in another tab) falls back to the default.
  useEffect(() => {
    if (threads !== EMPTY && wanted !== activeId) selectThread(botId, activeId);
  }, [botId, wanted, activeId, threads]);

  // The undo offer ends with its window; another bot never shows it.
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), NEW_CHAT_UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const open = useCallback(
    (fields: Parameters<typeof newThread>[3] = {}) => {
      const thread = newThread(botId, freshThreadId(), Date.now(), fields);
      saveThreads(botId, [...loadThreads(botId), thread]);
      selectThread(botId, thread.id);
      return thread;
    },
    [botId],
  );

  const create = useCallback(() => void open(), [open]);

  const rename = useCallback(
    (id: string, title: string) =>
      saveThreads(
        botId,
        renameThread(loadThreads(botId), id, title, Date.now()),
      ),
    [botId],
  );

  const remove = useCallback(
    (id: string) => {
      const thread = loadThreads(botId).find((t) => t.id === id);
      if (!thread || id === DEFAULT_THREAD_ID) return;
      setRemoved({ botId, thread, messages: loadBotMessages(botId, id) });
      if (selectedThreadId(botId) === id)
        selectThread(botId, DEFAULT_THREAD_ID);
      saveThreads(botId, removeThread(loadThreads(botId), id));
      forgetThreadMessages(botId, id);
    },
    [botId],
  );

  const undoRemove = useCallback(() => {
    if (removed?.botId !== botId) return;
    const { thread, messages } = removed;
    saveBotMessages(botId, messages, { threadId: thread.id });
    saveThreads(botId, [...loadThreads(botId), thread]);
    selectThread(botId, thread.id);
    setRemoved(null);
  }, [botId, removed]);

  /** Copies the thread up to a finished reply into a new thread and opens it. */
  const branchFrom = useCallback(
    (messageId: number, turnRunning: boolean) => {
      const from = loadThreads(botId).find((t) => t.id === activeId);
      const copy = branchThread(
        loadBotMessages(botId, activeId),
        messageId,
        turnRunning,
      );
      if (!from || !copy) return;
      const thread = newThread(botId, freshThreadId(), Date.now(), {
        title: branchTitle(
          displayTitle(from, getThreadCopy(language)),
          language,
        ),
        parentThreadId: from.id,
        branchedFromMessageId: messageId,
      });
      saveBotMessages(botId, copy.messages, { threadId: thread.id });
      saveThreads(botId, [...loadThreads(botId), thread]);
      selectThread(botId, thread.id);
    },
    [botId, activeId, language],
  );

  return {
    threads,
    activeId,
    select: (id: string) => selectThread(botId, id),
    create,
    rename,
    remove,
    removed: removed?.botId === botId ? removed.thread : null,
    undoRemove,
    branchFrom,
  };
}
