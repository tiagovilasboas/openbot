import type { FetchLike, ModelAdapter, ModelRequest } from "./model-adapter.ts";

export type AnthropicAdapterConfig = {
  apiKey: string;
  model: string;
  maxTokens?: number;
  fetchImpl?: FetchLike;
};

const endpoint = "https://api.anthropic.com/v1/messages";

export function createAnthropicAdapter(
  config: AnthropicAdapterConfig,
): ModelAdapter {
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    provider: "anthropic",
    model: config.model,
    async generateReply(request: ModelRequest) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens ?? 1024,
            ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
            messages: request.messages.map((message) => ({
              role: message.role,
              content: message.text,
            })),
          }),
        });
      } catch {
        return {
          ok: false,
          code: "provider_unreachable",
          provider: "anthropic",
        };
      }

      if (!response.ok) {
        return { ok: false, code: "provider_rejected", provider: "anthropic" };
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
