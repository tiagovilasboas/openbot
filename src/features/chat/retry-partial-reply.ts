import type { MessageData } from "./ChatMessageItem.tsx";

/** The user message that the reply at `index` answers. */
export function userMessageBefore(
  thread: MessageData[],
  index: number,
): MessageData | undefined {
  return thread
    .slice(0, index)
    .reverse()
    .find((m) => m.role === "user");
}

/**
 * Removes the assistant messages that answered one user message (up to the
 * next user message), so a retry replaces a partial reply instead of piling
 * a second answer next to it.
 */
export function dropRepliesTo(
  thread: MessageData[],
  userMessageId: number,
): MessageData[] {
  const index = thread.findIndex(
    (m) => m.id === userMessageId && m.role === "user",
  );
  if (index === -1) return thread;
  let end = index + 1;
  while (end < thread.length && thread[end]?.role === "assistant") end += 1;
  if (end === index + 1) return thread;
  return [...thread.slice(0, index + 1), ...thread.slice(end)];
}
