export interface HistoryMessage {
  role: "assistant" | "user";
  text: string;
}

/** Newest messages sent per request; the server accepts at most 50. */
export const MAX_HISTORY_MESSAGES = 40;

/**
 * Keeps the newest messages that fit the server limit, starting on a user
 * message. The turn's own user message is already last in a valid thread.
 */
export function limitHistory(
  history: HistoryMessage[],
  max: number = MAX_HISTORY_MESSAGES,
): HistoryMessage[] {
  const recent = history.slice(-max);
  const firstUser = recent.findIndex((m) => m.role === "user");
  return firstUser === -1 ? [] : recent.slice(firstUser);
}
