import { providerErrorDetail } from "./provider-error-detail.ts";
import type { ModelStreamChunk } from "./stream-adapter.ts";
import { asRecord, parseJsonLine, tokenCount } from "./stream-lines.ts";

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
