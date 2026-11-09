import { BlockedBaseUrlError, modelFetch } from "./guarded-model-fetch.ts";
import type { ModelNetworkOptions } from "./guarded-model-fetch.ts";
import type { FetchLike, ModelAdapter, ModelRequest } from "./model-adapter.ts";

export type LocalAdapterConfig = {
  baseUrl: string;
  model: string;
  fetchImpl?: FetchLike;
  /** True when baseUrl came from a client and must pass the URL guard. */
  guardUrl?: boolean;
} & ModelNetworkOptions;

export function createLocalAdapter(config: LocalAdapterConfig): ModelAdapter {
  const fetchImpl = config.fetchImpl ?? fetch;
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/api/chat`;

  return {
    provider: "local",
    model: config.model,
    async generateReply(request: ModelRequest) {
      let response: Response;
      try {
        response = await modelFetch(
          fetchImpl,
          endpoint,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
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
          },
          config,
        );
      } catch (error) {
        if (error instanceof BlockedBaseUrlError) {
          return { ok: false, code: "blocked_base_url", provider: "local" };
        }
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
