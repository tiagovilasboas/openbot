import { BlockedBaseUrlError, modelFetch } from "./guarded-model-fetch.ts";
import type { ModelNetworkOptions } from "./guarded-model-fetch.ts";
import type { FetchLike, ModelRequest } from "./model-adapter.ts";
import { openModelStream } from "./open-model-stream.ts";
import { parseRouterStream } from "./router-stream.ts";
import { openAiUsage } from "./token-usage.ts";
import type { StreamingModelAdapter } from "./stream-adapter.ts";
import { toolsBody, toWireMessages } from "./wire-messages.ts";
import { providerErrorDetail } from "./provider-error-detail.ts";

export type RouterAdapterConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
  fetchImpl?: FetchLike;
  /** True when baseUrl came from a client and must pass the URL guard. */
  guardUrl?: boolean;
} & ModelNetworkOptions;

function requestHeaders(apiKey: string | undefined) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
    // Helpful metadata for OpenRouter/OmniRoute analytics if present
    headers["http-referer"] = "https://openbot.local";
    headers["x-title"] = "OpenBot";
  }
  return headers;
}

export function createRouterAdapter(
  config: RouterAdapterConfig,
): StreamingModelAdapter {
  const fetchImpl = config.fetchImpl ?? fetch;
  const trimmed = config.baseUrl.replace(/\/+$/, "");
  const endpoint = trimmed.endsWith("/chat/completions")
    ? trimmed
    : `${trimmed}/chat/completions`;

  return {
    provider: "router",
    model: config.model,
    streamReply(request, signal) {
      const model = request.modelId ?? config.model;
      return openModelStream({
        provider: "router",
        model: model,
        fetchImpl,
        url: endpoint,
        headers: requestHeaders(config.apiKey),
        body: {
          model: model,
          stream: true,
          messages: toWireMessages(request),
          ...toolsBody(request.tools),
        },
        network: config,
        signal,
        parse: parseRouterStream,
      });
    },
    async generateReply(request: ModelRequest) {
      const headers = requestHeaders(config.apiKey);

      let response: Response;
      try {
        response = await modelFetch(
          fetchImpl,
          endpoint,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: request.modelId ?? config.model,
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
          return { ok: false, code: "blocked_base_url", provider: "router" };
        }
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
        const detail = providerErrorDetail(response.status, msg);
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
          choices?: Array<{
            message?: { content?: unknown; reasoning?: unknown };
          }>;
        } | null
      )?.choices?.[0];
      const content = choice?.message?.content;

      if (typeof content !== "string" || !content.trim()) {
        // Say why, so a failover reason tells "no text at all" apart from
        // "the text came only as reasoning".
        const reasoning = choice?.message?.reasoning;
        return {
          ok: false,
          code: "invalid_provider_response",
          provider: "router",
          detail:
            typeof reasoning === "string" && reasoning.trim()
              ? `${response.status}: empty_content_reasoning_only`
              : `${response.status}: empty_content`,
        };
      }
      const usage = openAiUsage(payload);
      return {
        ok: true,
        provider: "router",
        text: content,
        ...(usage ? { usage } : {}),
      };
    },
  };
}
