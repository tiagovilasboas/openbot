import type { FetchLike, ModelAdapter, ModelRequest } from "./model-adapter.ts";

export type LocalAdapterConfig = {
  baseUrl: string;
  model: string;
  fetchImpl?: FetchLike;
};

export function createLocalAdapter(config: LocalAdapterConfig): ModelAdapter {
  const fetchImpl = config.fetchImpl ?? fetch;
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/api/chat`;

  return {
    provider: "local",
    model: config.model,
    async generateReply(request: ModelRequest) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
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
        return { ok: false, code: "provider_unreachable", provider: "local" };
      }

      if (!response.ok) {
        return { ok: false, code: "provider_rejected", provider: "local" };
      }

      const payload: unknown = await response.json().catch(() => null);
      const content = (payload as { message?: { content?: unknown } } | null)
        ?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        return {
          ok: false,
          code: "invalid_provider_response",
          provider: "local",
        };
      }
      return { ok: true, provider: "local", text: content };
    },
  };
}
