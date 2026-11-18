// The ask_user tool's contract: what the model may ask and what the user may
// answer. Pure and shared by the server (loop) and the client (card), so both
// read the same limits. Model text is untrusted: every field is checked here.

export const ASK_USER = "ask_user";

export const ASK_USER_LIMITS = {
  questionMaxChars: 300,
  optionMaxChars: 80,
  minOptions: 2,
  maxOptions: 6,
  answerMaxChars: 300,
} as const;

/** What the card shows: a question, 2 to 6 distinct options, maybe free text. */
export type AskUserPrompt = {
  question: string;
  options: string[];
  allowFreeText: boolean;
};

/** The user's reply: one of the options by index, or their own words. */
export type UserAnswer =
  { kind: "option"; index: number } | { kind: "text"; text: string };

const KEYS = new Set(["question", "options", "allowFreeText"]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = oneLine(value);
  return text && text.length <= max ? text : null;
}

/**
 * Strict parse of the model's arguments. Unknown keys, empty or long texts,
 * and fewer than 2 or more than 6 options (after dropping repeats, ignoring
 * case) are refused.
 */
export function parseAskUserPrompt(raw: unknown): AskUserPrompt | null {
  if (!isRecord(raw) || Object.keys(raw).some((key) => !KEYS.has(key))) {
    return null;
  }
  const question = cleanText(raw.question, ASK_USER_LIMITS.questionMaxChars);
  if (!question || !Array.isArray(raw.options)) return null;
  if (raw.options.length > ASK_USER_LIMITS.maxOptions * 2) return null;
  const options: string[] = [];
  const seen = new Set<string>();
  for (const item of raw.options) {
    const option = cleanText(item, ASK_USER_LIMITS.optionMaxChars);
    if (!option) return null;
    const key = option.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(option);
  }
  if (
    options.length < ASK_USER_LIMITS.minOptions ||
    options.length > ASK_USER_LIMITS.maxOptions
  ) {
    return null;
  }
  const free = raw.allowFreeText;
  if (free !== undefined && typeof free !== "boolean") return null;
  return { question, options, allowFreeText: free === true };
}

/** The answer as it comes over the wire: shape and size only. */
export function parseUserAnswer(raw: unknown): UserAnswer | null {
  if (!isRecord(raw)) return null;
  if (raw.kind === "option") {
    const { index } = raw;
    return Number.isInteger(index) &&
      (index as number) >= 0 &&
      (index as number) < ASK_USER_LIMITS.maxOptions
      ? { kind: "option", index: index as number }
      : null;
  }
  if (raw.kind === "text") {
    const text = cleanText(raw.text, ASK_USER_LIMITS.answerMaxChars);
    return text ? { kind: "text", text } : null;
  }
  return null;
}

export type AnswerResult =
  | { ok: true; text: string; preview: string }
  | { ok: false; code: "bad_answer" };

/**
 * Binds an answer to the stored question: the index must name one of its
 * options, and free text counts only when the question allows it. The text
 * goes back to the model; the preview (the answer alone) to the thread.
 */
export function answerAskUser(
  prompt: AskUserPrompt,
  answer: unknown,
): AnswerResult {
  const parsed = parseUserAnswer(answer);
  if (!parsed) return { ok: false, code: "bad_answer" };
  let value: string;
  if (parsed.kind === "option") {
    const option = prompt.options[parsed.index];
    if (option === undefined) return { ok: false, code: "bad_answer" };
    value = option;
  } else {
    if (!prompt.allowFreeText) return { ok: false, code: "bad_answer" };
    value = parsed.text;
  }
  const source = parsed.kind === "option" ? "option" : "free_text";
  return {
    ok: true,
    text: JSON.stringify({ question: prompt.question, answer: value, source }),
    preview: value,
  };
}
