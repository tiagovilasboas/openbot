// Builds the one-off request of a side question. Pure: no React, no fetch.
import type { HistoryMessage } from "../chat/request-model-reply.ts";

/** Recent messages the side question sees; older ones stay out. */
export const SIDE_QUESTION_CONTEXT_MESSAGES = 12;
export const SIDE_QUESTION_MAX_CHARS = 2_000;

type ThreadMessage = { role: "assistant" | "user"; text: string };

/**
 * The thread's last messages plus the question. Nothing here is stored:
 * the answer lives only in the side panel and the thread stays as it was.
 */
export function sideQuestionMessages(
  thread: readonly ThreadMessage[],
  question: string,
  limit = SIDE_QUESTION_CONTEXT_MESSAGES,
): HistoryMessage[] | null {
  const asked = question.trim().slice(0, SIDE_QUESTION_MAX_CHARS);
  if (!asked) return null;
  const recent = thread
    .filter((m) => m.text.trim() !== "")
    .slice(-limit)
    .map((m) => ({ role: m.role, text: m.text }));
  // The model expects turns to start with the user; a leading reply goes.
  while (recent[0]?.role === "assistant") recent.shift();
  return [...recent, { role: "user", text: asked }];
}
