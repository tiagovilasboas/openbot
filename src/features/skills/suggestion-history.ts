/**
 * The slice of a bot's chat that a skill suggestion reads: only what the user
 * wrote, each message clipped, the most recent ones. The client builds it and
 * the server re-applies the same limits, so neither trusts the other.
 */

export const SUGGEST_MIN_MESSAGES = 5;
export const SUGGEST_MAX_MESSAGES = 40;
export const SUGGEST_MAX_MESSAGE_LENGTH = 300;

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;

/** One line of plain text, cut to the limit; empty if nothing is left. */
function clipMessage(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SUGGEST_MAX_MESSAGE_LENGTH)
    .trim();
}

/**
 * The messages that may reach a prompt: strings only, each clipped, empty
 * ones dropped, and the last SUGGEST_MAX_MESSAGES kept in order.
 */
export function clipHistory(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const clipped = raw.map(clipMessage).filter((text) => text.length > 0);
  return clipped.slice(-SUGGEST_MAX_MESSAGES);
}

/** What the user wrote in a stored conversation, clipped and capped. */
export function userMessagesOf(
  messages: readonly { role: string; text: string }[],
): string[] {
  return clipHistory(
    messages.filter((m) => m.role === "user").map((m) => m.text),
  );
}
