import { providerErrorDetail } from "./provider-error-detail.ts";
import type { ModelRequest } from "./model-adapter.ts";
import type { ModelStreamChunk } from "./stream-adapter.ts";
import {
  asRecord,
  parseJsonLine,
  sseData,
  tokenCount,
} from "./stream-lines.ts";

export function anthropicStreamBody(
  model: string,
  maxTokens: number,
  request: ModelRequest,
) {
  return {
    model,
    max_tokens: maxTokens,
    stream: true,
    ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
    messages: request.messages.map((message) => ({
      role: message.role,
      content: message.text,
    })),
  };
}

// Anthropic reports failures mid-stream as a typed `error` event.
const errorStatus: Record<string, number> = {
  invalid_request_error: 400,
  authentication_error: 401,
  permission_error: 403,
  not_found_error: 404,
  rate_limit_error: 429,
  overloaded_error: 529,
};

function usageChunk(
  usage: Record<string, unknown> | undefined,
): ModelStreamChunk[] {
  const inputTokens = tokenCount(usage?.input_tokens);
  const outputTokens = tokenCount(usage?.output_tokens);
  return inputTokens === undefined && outputTokens === undefined
    ? []
    : [{ type: "usage", usage: { inputTokens, outputTokens } }];
}

/** Anthropic messages SSE: only text deltas, usage and the stop/error events matter. */
export async function* parseAnthropicStream(
  lines: AsyncIterable<string>,
): AsyncGenerator<ModelStreamChunk> {
  for await (const line of lines) {
    const data = sseData(line);
    const event = data === null ? null : parseJsonLine(data);
    if (!event) continue;

    if (event.type === "message_start") {
      yield* usageChunk(asRecord(asRecord(event.message)?.usage));
    } else if (event.type === "content_block_delta") {
      const delta = asRecord(event.delta);
      if (delta?.type === "text_delta" && typeof delta.text === "string") {
        if (delta.text) yield { type: "delta", text: delta.text };
      }
    } else if (event.type === "message_delta") {
      yield* usageChunk(asRecord(event.usage));
    } else if (event.type === "message_stop") {
      return;
    } else if (event.type === "error") {
      const kind = asRecord(event.error)?.type;
      // `kind` comes from the stream: "constructor" or "__proto__" must not
      // reach the inherited members of the table.
      const status =
        typeof kind === "string" && Object.hasOwn(errorStatus, kind)
          ? errorStatus[kind]
          : 500;
      yield {
        type: "failed",
        code: "provider_rejected",
        detail: providerErrorDetail(status),
      };
      return;
    }
  }
  // The stream closed without message_stop: the reply was cut short.
  yield { type: "failed", code: "provider_unreachable" };
}
