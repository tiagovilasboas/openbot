import type { MessageData } from "./ChatMessageItem.tsx";

/** How long "Undo" stays offered after a new chat clears the thread. */
export const NEW_CHAT_UNDO_WINDOW_MS = 8_000;

/** The thread a new chat just cleared, kept in memory for one bot. */
export interface ClearedThread {
  botId: string;
  messages: MessageData[];
}

/** Keeps a thread for undo; an empty thread has nothing to bring back. */
export function holdClearedThread(
  botId: string,
  messages: MessageData[],
): ClearedThread | null {
  return messages.length > 0 ? { botId, messages } : null;
}

/**
 * The messages to put back, or none once the window has closed: another bot
 * is active, or the thread already has new messages that restoring would drop.
 */
export function restorableMessages(
  held: ClearedThread | null,
  activeBotId: string,
  currentMessages: MessageData[],
): MessageData[] | null {
  if (!held || held.botId !== activeBotId) return null;
  return currentMessages.length === 0 ? held.messages : null;
}
