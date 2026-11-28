import type { ModelNetworkOptions } from "./guarded-model-fetch.ts";
import type { FetchLike, ModelRequest } from "./model-adapter.ts";
import { openAiGenerateReply } from "./openai-chat-reply.ts";
import { openModelStream } from "./open-model-stream.ts";
import { parseRouterStream } from "./router-stream.ts";
import type { StreamingModelAdapter } from "./stream-adapter.ts";
import { toolsBody, toWireMessages } from "./wire-messages.ts";

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
        model,
        fetchImpl,
        url: endpoint,
        headers: requestHeaders(config.apiKey),
        body: {
          model,
          stream: true,
          messages: toWireMessages(request),
          ...toolsBody(request.tools),
        },
        network: config,
        signal,
        parse: parseRouterStream,
      });
    },
    generateReply(request: ModelRequest) {
      return openAiGenerateReply({
        provider: "router",
        endpoint,
        model: config.model,
        headers: requestHeaders(config.apiKey),
        request,
        fetchImpl,
        network: config,
      });
    },
  };
}
