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

function messageBytes(message: HistoryMessage): number {
  return new TextEncoder().encode(JSON.stringify(message)).length;
}

/**
 * Drops the oldest messages until the rest fit the byte budget, so a request
 * that carries files stays under the body limit. The turn's own message is
 * always kept, and the history still starts on a user message.
 */
export function fitHistoryToBytes(
  history: HistoryMessage[],
  budget: number,
): HistoryMessage[] {
  let used = 0;
  let from = history.length;
  while (from > 0) {
    used += messageBytes(history[from - 1]);
    if (used > budget && from < history.length) break;
    from -= 1;
  }
  return limitHistory(history.slice(from), history.length);
}
