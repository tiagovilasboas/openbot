import { asRecord, tokenCount } from "./stream-lines.ts";

/** Token counts a provider reported; either side may be missing. */
export type TokenUsage = { inputTokens?: number; outputTokens?: number };

/** The counts that are valid numbers, or undefined when the provider gave none. */
export function tokenUsage(
  input: unknown,
  output: unknown,
): TokenUsage | undefined {
  const inputTokens = tokenCount(input);
  const outputTokens = tokenCount(output);
  if (inputTokens === undefined && outputTokens === undefined) {
    return undefined;
  }
  return {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
  };
}

/** Anthropic messages: `usage.input_tokens` and `usage.output_tokens`. */
export function anthropicUsage(payload: unknown): TokenUsage | undefined {
  const usage = asRecord(asRecord(payload)?.usage);
  return tokenUsage(usage?.input_tokens, usage?.output_tokens);
}

/** OpenAI-compatible chat completions: `usage.prompt_tokens` and `completion_tokens`. */
export function openAiUsage(payload: unknown): TokenUsage | undefined {
  const usage = asRecord(asRecord(payload)?.usage);
  return tokenUsage(usage?.prompt_tokens, usage?.completion_tokens);
}

/** Ollama /api/chat: `prompt_eval_count` and `eval_count` at the top level. */
export function ollamaUsage(payload: unknown): TokenUsage | undefined {
  const body = asRecord(payload);
  return tokenUsage(body?.prompt_eval_count, body?.eval_count);
}

/**
 * Our own wire shape (`{inputTokens, outputTokens}`) read back from the BFF,
 * where the client must not trust the numbers.
 */
export function readTokenUsage(value: unknown): TokenUsage | undefined {
  const usage = asRecord(value);
  return tokenUsage(usage?.inputTokens, usage?.outputTokens);
}
