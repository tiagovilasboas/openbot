import { providerErrorDetail } from "./provider-error-detail.ts";
import type { ModelStreamChunk } from "./stream-adapter.ts";
import { asRecord, parseJsonLine, tokenCount } from "./stream-lines.ts";
import { MAX_TOOL_ARGS_CHARS } from "./tool-wire.ts";

/** Ollama sends whole calls with object arguments; re-encode them as JSON text. */
function* localToolCalls(calls: unknown): Generator<ModelStreamChunk> {
  if (!Array.isArray(calls)) return;
  for (const [index, raw] of calls.slice(0, 8).entries()) {
    const fn = asRecord(asRecord(raw)?.function);
    const name = fn?.name;
    if (typeof name !== "string" || !/^[A-Za-z0-9_.-]{1,64}$/.test(name)) {
      continue;
    }
    const args = JSON.stringify(asRecord(fn?.arguments) ?? {});
    const tooLong = args.length > MAX_TOOL_ARGS_CHARS;
    yield {
      type: "tool_call",
      id: `call_${index}`,
      name,
      argsJson: tooLong ? "" : args,
      ...(tooLong ? { argsError: "too_long" as const } : {}),
    };
  }
}

/**
 * Ollama-style /api/chat NDJSON: one object per line with `message.content`,
 * and a final `done: true` object carrying the token counts.
 */
export async function* parseLocalStream(
  lines: AsyncIterable<string>,
): AsyncGenerator<ModelStreamChunk> {
  for await (const line of lines) {
    const event = parseJsonLine(line);
    if (!event) continue;

    if (typeof event.error === "string") {
      yield {
        type: "failed",
        code: "provider_rejected",
        detail: providerErrorDetail(500),
      };
      return;
    }
    const text = asRecord(event.message)?.content;
    if (typeof text === "string" && text) yield { type: "delta", text };
    yield* localToolCalls(asRecord(event.message)?.tool_calls);
    if (event.done === true) {
      const inputTokens = tokenCount(event.prompt_eval_count);
      const outputTokens = tokenCount(event.eval_count);
      if (inputTokens !== undefined || outputTokens !== undefined) {
        yield { type: "usage", usage: { inputTokens, outputTokens } };
      }
      return;
    }
  }
  yield { type: "failed", code: "provider_unreachable" };
}
