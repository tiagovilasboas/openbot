import { modelFetch } from "./guarded-model-fetch.ts";
import type { ModelNetworkOptions } from "./guarded-model-fetch.ts";
import type { FetchLike, ModelRequest } from "./model-adapter.ts";
import { providerErrorDetail } from "./provider-error-detail.ts";
import {
  anthropicStreamBody,
  parseAnthropicStream,
} from "./anthropic-stream.ts";
import { openModelStream } from "./open-model-stream.ts";
import type { StreamingModelAdapter } from "./stream-adapter.ts";

export type AnthropicAdapterConfig = {
  apiKey: string;
  model: string;
  maxTokens?: number;
  fetchImpl?: FetchLike;
} & ModelNetworkOptions;

const endpoint = "https://api.anthropic.com/v1/messages";

export function createAnthropicAdapter(
  config: AnthropicAdapterConfig,
): StreamingModelAdapter {
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    provider: "anthropic",
    model: config.model,
    streamReply(request, signal) {
      return openModelStream({
        provider: "anthropic",
        model: config.model,
        fetchImpl,
        url: endpoint,
        headers: {
          "content-type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: anthropicStreamBody(
          config.model,
          config.maxTokens ?? 1024,
          request,
        ),
        network: config,
        signal,
        parse: parseAnthropicStream,
      });
    },
    async generateReply(request: ModelRequest) {
      let response: Response;
      try {
        response = await modelFetch(
          fetchImpl,
          endpoint,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": config.apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: request.modelId ?? config.model,
              max_tokens: config.maxTokens ?? 1024,
              ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
              messages: request.messages.map((message) => ({
                role: message.role,
                content: message.text,
              })),
            }),
          },
          config,
        );
      } catch {
        return {
          ok: false,
          code: "provider_unreachable",
          provider: "anthropic",
        };
      }

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          error?: { message?: unknown };
        } | null;
        const msg =
          typeof errorPayload?.error?.message === "string"
            ? errorPayload.error.message.trim()
            : null;
        const detail = providerErrorDetail(response.status, msg);
        return {
          ok: false,
          code: "provider_rejected",
          provider: "anthropic",
          detail,
        };
      }

      const payload: unknown = await response.json().catch(() => null);
      const first = (payload as { content?: unknown[] } | null)?.content?.[0];
      const text = (first as { text?: unknown } | undefined)?.text;
      if (typeof text !== "string" || !text.trim()) {
        return {
          ok: false,
          code: "invalid_provider_response",
          provider: "anthropic",
        };
      }
      return { ok: true, provider: "anthropic", text };
    },
  };
}
