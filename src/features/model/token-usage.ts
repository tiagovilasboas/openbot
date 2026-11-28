import { asRecord, tokenCount } from "./stream-lines.ts";

/** Token counts and optional USD cost reported by a provider. */
export type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
};

function validCost(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.min(value, 10_000);
}

/** The counts (and optional USD cost) that are valid numbers, or undefined. */
export function tokenUsage(
  input: unknown,
  output: unknown,
  cost?: unknown,
): TokenUsage | undefined {
  const inputTokens = tokenCount(input);
  const outputTokens = tokenCount(output);
  const costUsd = validCost(cost);
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    costUsd === undefined
  ) {
    return undefined;
  }
  return {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(costUsd !== undefined ? { costUsd } : {}),
  };
}

/** Anthropic messages: `usage.input_tokens` and `usage.output_tokens`. */
export function anthropicUsage(payload: unknown): TokenUsage | undefined {
  const usage = asRecord(asRecord(payload)?.usage);
  return tokenUsage(usage?.input_tokens, usage?.output_tokens);
}

/** OpenAI-compatible chat completions: `usage.prompt_tokens`, `completion_tokens` and optional `cost`. */
export function openAiUsage(payload: unknown): TokenUsage | undefined {
  const usage = asRecord(asRecord(payload)?.usage);
  return tokenUsage(
    usage?.prompt_tokens,
    usage?.completion_tokens,
    usage?.cost,
  );
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
  return tokenUsage(usage?.inputTokens, usage?.outputTokens, usage?.costUsd);
}
