"use client";

import { useCallback, useEffect, useState } from "react";
import type { MessageData } from "./ChatMessageItem.tsx";
import {
  NEW_CHAT_UNDO_WINDOW_MS,
  holdClearedThread,
  restorableMessages,
  type ClearedThread,
} from "./new-chat-undo.ts";

interface NewChatUndoOptions {
  botId: string;
  messages: MessageData[];
  persistMessages: (messages: MessageData[]) => void;
  /** Clears the thread; the hook keeps a copy first. */
  startNewChat: () => void;
}

/**
 * Makes "New chat" recoverable: the cleared thread waits in memory for a few
 * seconds. Sending a message or switching bot closes the window.
 */
export function useNewChatUndo({
  botId,
  messages,
  persistMessages,
  startNewChat,
}: NewChatUndoOptions) {
  const [held, setHeld] = useState<ClearedThread | null>(null);

  const newChatWithUndo = useCallback(() => {
    setHeld(holdClearedThread(botId, messages));
    startNewChat();
  }, [botId, messages, startNewChat]);

  const undo = useCallback(() => {
    const back = restorableMessages(held, botId, messages);
    if (back) persistMessages(back);
    setHeld(null);
  }, [held, botId, messages, persistMessages]);

  // Closed by the timer, a bot switch, or the thread getting messages again.
  const isOpen = held !== null && held.botId === botId && messages.length === 0;
  useEffect(() => {
    if (!held) return;
    const timer = setTimeout(() => setHeld(null), NEW_CHAT_UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [held]);

  return { canUndo: isOpen, newChatWithUndo, undo };
}
