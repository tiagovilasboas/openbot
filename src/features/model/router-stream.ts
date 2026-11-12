import { providerErrorDetail } from "./provider-error-detail.ts";
import { createToolCallAssembler } from "./tool-call-assembler.ts";
import type { ModelStreamChunk } from "./stream-adapter.ts";
import {
  asRecord,
  parseJsonLine,
  sseData,
  tokenCount,
} from "./stream-lines.ts";

/** An upstream error inside the stream; the status picks a fixed detail tag. */
function failure(error: Record<string, unknown> | undefined): ModelStreamChunk {
  const status = tokenCount(error?.code);
  const message = typeof error?.message === "string" ? error.message : null;
  return {
    type: "failed",
    code: "provider_rejected",
    detail: providerErrorDetail(
      status !== undefined && status >= 400 && status <= 599 ? status : 500,
      message,
    ),
  };
}

/**
 * OpenAI-compatible chat completions SSE (OpenRouter, OmniRoute, 9Router):
 * `choices[0].delta.content` text, streamed `tool_calls` fragments (assembled
 * by index into whole calls), a trailing `usage`, and `[DONE]`. Comment
 * lines (": keep-alive") are ignored because they carry no `data:` prefix.
 */
export async function* parseRouterStream(
  lines: AsyncIterable<string>,
): AsyncGenerator<ModelStreamChunk> {
  let finished = false;
  const calls = createToolCallAssembler();
  for await (const line of lines) {
    const data = sseData(line);
    if (data === null) continue;
    if (data === "[DONE]") {
      yield* calls.flush();
      return;
    }
    const event = parseJsonLine(data);
    if (!event) continue;

    if (event.error) {
      yield failure(asRecord(event.error));
      return;
    }
    const usage = asRecord(event.usage);
    const inputTokens = tokenCount(usage?.prompt_tokens);
    const outputTokens = tokenCount(usage?.completion_tokens);
    if (inputTokens !== undefined || outputTokens !== undefined) {
      yield { type: "usage", usage: { inputTokens, outputTokens } };
    }
    const choice = asRecord(
      Array.isArray(event.choices) ? event.choices[0] : undefined,
    );
    const text = asRecord(choice?.delta)?.content;
    if (typeof text === "string" && text) yield { type: "delta", text };
    calls.add(asRecord(choice?.delta)?.tool_calls);
    if (choice?.finish_reason === "error") {
      yield failure(undefined);
      return;
    }
    if (typeof choice?.finish_reason === "string") {
      finished = true;
      yield* calls.flush();
    }
  }
  // A stream cut off before finish_reason leaves its calls unfinished; drop them.
  // Some servers skip [DONE]; a finish_reason is enough to call it complete.
  if (!finished) yield { type: "failed", code: "provider_unreachable" };
}
