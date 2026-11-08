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
            messages: [
              ...(request.systemPrompt
                ? [{ role: "system", content: request.systemPrompt }]
                : []),
              ...request.messages.map((message) => ({
                role: message.role,
                content: message.text,
              })),
            ],
          }),
        });
      } catch {
        return { ok: false, code: "provider_unreachable", provider: "router" };
      }

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          error?: { message?: unknown };
        } | null;
        const msg =
          typeof errorPayload?.error?.message === "string"
            ? errorPayload.error.message.trim()
            : null;
        const detail = msg
          ? `${response.status}: ${msg}`
          : `HTTP ${response.status}`;
        return {
          ok: false,
          code: "provider_rejected",
          provider: "router",
          detail,
        };
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
