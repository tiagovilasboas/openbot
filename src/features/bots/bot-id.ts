/**
 * A bot id becomes part of storage keys (messages, memory) and of usage
 * records, so it is short and plain. Legacy ids ("default", "chief-of-staff",
 * the crew presets, "bot_<time>_<random>") all fit.
 */
export const BOT_ID_MAX_LENGTH = 64;

const BOT_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const RESERVED_IDS = new Set(["__proto__", "constructor", "prototype"]);

/** Whether the id is safe to use in a storage key and as an object key. */
export function isValidBotId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= BOT_ID_MAX_LENGTH &&
    BOT_ID_PATTERN.test(id) &&
    !RESERVED_IDS.has(id)
  );
}
