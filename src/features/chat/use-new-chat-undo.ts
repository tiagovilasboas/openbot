"use client";

import { useCallback, useEffect, useState } from "react";
import type { MessageData } from "./ChatMessageItem.tsx";
import { focusComposer } from "./focus-composer.ts";
import {
  NEW_CHAT_UNDO_WINDOW_MS,
  holdClearedThread,
  restorableMessages,
  stillHeld,
  type ClearedThread,
} from "./new-chat-undo.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface NewChatUndoOptions {
  language: ChatLanguage;
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
  language,
  botId,
  messages,
  persistMessages,
  startNewChat,
}: NewChatUndoOptions) {
  const [held, setHeld] = useState<ClearedThread | null>(null);

  const newChatWithUndo = useCallback(() => {
    setHeld(holdClearedThread(botId, messages));
    startNewChat();
    // The button that was pressed is disabled or gone; keep the keyboard here.
    focusComposer(language);
  }, [language, botId, messages, startNewChat]);

  const undo = useCallback(() => {
    const back = restorableMessages(held, botId, messages);
    if (back) persistMessages(back);
    setHeld(null);
    // The Undo button unmounts with the notice.
    focusComposer(language);
  }, [language, held, botId, messages, persistMessages]);

  // A message or a bot switch drops the held thread for good. Adjusting state
  // while rendering settles in one pass, with no effect to loop.
  const kept = stillHeld(held, botId, messages);
  if (kept !== held) setHeld(kept);
  const isOpen = kept !== null;
  useEffect(() => {
    if (!held) return;
    const timer = setTimeout(() => setHeld(null), NEW_CHAT_UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [held]);

  return { canUndo: isOpen, newChatWithUndo, undo };
}
