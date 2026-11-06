import type { FetchLike, ModelAdapter, ModelRequest } from "./model-adapter.ts";

export type RouterAdapterConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
  fetchImpl?: FetchLike;
};

export function createRouterAdapter(config: RouterAdapterConfig): ModelAdapter {
  const fetchImpl = config.fetchImpl ?? fetch;
  const trimmed = config.baseUrl.replace(/\/+$/, "");
  const endpoint = trimmed.endsWith("/chat/completions")
    ? trimmed
    : `${trimmed}/chat/completions`;

  return {
    provider: "router",
    model: config.model,
    async generateReply(request: ModelRequest) {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (config.apiKey) {
        headers.authorization = `Bearer ${config.apiKey}`;
        // Helpful metadata for OpenRouter/OmniRoute analytics if present
        headers["http-referer"] = "https://openbot.local";
        headers["x-title"] = "OpenBot";
      }

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: config.model,
            stream: false,
            messages: request.messages.map((message) => ({
              role: message.role,
              content: message.text,
            })),
          }),
        });
      } catch {
        return { ok: false, code: "provider_unreachable", provider: "router" };
      }

      if (!response.ok) {
        return { ok: false, code: "provider_rejected", provider: "router" };
      }

      const payload: unknown = await response.json().catch(() => null);
      const choice = (
        payload as {
          choices?: Array<{ message?: { content?: unknown } }>;
        } | null
      )?.choices?.[0];
      const content = choice?.message?.content;

      if (typeof content !== "string" || !content.trim()) {
        return {
          ok: false,
          code: "invalid_provider_response",
          provider: "router",
        };
      }
      return { ok: true, provider: "router", text: content };
    },
  };
}
