import {
  answerAskUser,
  ASK_USER,
  ASK_USER_LIMITS,
  parseAskUserPrompt,
  type AskUserPrompt,
} from "../ask-user.ts";
import type { ToolDefinition } from "../tool-definition.ts";

/**
 * Asks the user a question with 2 to 6 options and, if allowed, free text.
 * It never runs on the server: the turn pauses, the chat shows the question,
 * and the user's answer is the result. Its level defaults to allow.
 */
export function createAskUserTool(): ToolDefinition<AskUserPrompt> {
  return {
    name: ASK_USER,
    description:
      "Ask the user one multiple-choice question when you need their decision to continue. Call it alone, then wait for the answer.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question, one short line",
          maxLength: ASK_USER_LIMITS.questionMaxChars,
        },
        options: {
          type: "array",
          description: "2 to 6 distinct short answers the user can pick",
          items: { type: "string", maxLength: ASK_USER_LIMITS.optionMaxChars },
        },
        allowFreeText: {
          type: "boolean",
          description: "Whether the user may also type their own answer",
        },
      },
      required: ["question", "options"],
      additionalProperties: false,
    },
    policy: "ask",
    // "allow" is its default level; it still waits for the user every time.
    allowAlways: true,
    defaultLevel: "allow",
    timeoutMs: 1_000,
    maxResultChars: 1_000,
    parseArgs(raw) {
      const prompt = parseAskUserPrompt(raw);
      return prompt ? { ok: true, args: prompt } : { ok: false };
    },
    async run() {
      return { ok: false, code: "needs_user" };
    },
    answer: answerAskUser,
  };
}
