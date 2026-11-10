import type { MessageData } from "./ChatMessageItem.tsx";

export interface RolledBackThread {
  /** The messages before the chosen one, in order. */
  messages: MessageData[];
  /** The chosen message's text, to put back in the composer. */
  text: string;
  /** How many messages after the chosen one are discarded. */
  discarded: number;
}

/**
 * Cuts the thread back to just before one of the user's own messages. The
 * message itself leaves the thread so sending it again does not duplicate it.
 * Unknown ids and assistant messages cannot be rolled back.
 */
export function rollBackThread(
  messages: MessageData[],
  messageId: number,
): RolledBackThread | null {
  const index = messages.findIndex(
    (m) => m.id === messageId && m.role === "user",
  );
  if (index === -1) return null;
  return {
    messages: messages.slice(0, index),
    text: messages[index].text,
    discarded: messages.length - index - 1,
  };
}

export type RollbackBlock = "running" | "queued";

/**
 * Why going back is not allowed right now, or null when it is. A turn in
 * flight (or messages waiting behind it) would write replies into a thread
 * that no longer contains the message they answer.
 */
export function rollbackBlock(
  turnRunning: boolean,
  queueCount: number,
): RollbackBlock | null {
  if (turnRunning) return "running";
  return queueCount > 0 ? "queued" : null;
}
