import type { MessageData } from "./ChatMessageItem.tsx";

/**
 * The conversation as the model must see it for one turn: everything up to
 * and including that turn's user message, so a message queued behind it never
 * leaks in and the last message is always the user's.
 */
export function threadUpTo(
  thread: MessageData[],
  userMessageId: number,
): MessageData[] {
  const index = thread.findIndex(
    (m) => m.id === userMessageId && m.role === "user",
  );
  return index === -1 ? thread : thread.slice(0, index + 1);
}

/**
 * Places a finished reply right after the user message it answers. Messages
 * queued meanwhile stay in the thread, after the reply, instead of being
 * overwritten by a stale copy.
 */
export function insertReplyAfter(
  thread: MessageData[],
  userMessageId: number,
  reply: MessageData[],
): MessageData[] {
  const index = thread.findIndex(
    (m) => m.id === userMessageId && m.role === "user",
  );
  if (index === -1) return [...thread, ...reply];
  return [...thread.slice(0, index + 1), ...reply, ...thread.slice(index + 1)];
}
