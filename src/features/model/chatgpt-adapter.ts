import type { ModelNetworkOptions } from "./guarded-model-fetch.ts";
import type { FetchLike, ModelRequest } from "./model-adapter.ts";
import { openAiGenerateReply } from "./openai-chat-reply.ts";
import { openModelStream } from "./open-model-stream.ts";
import { parseRouterStream } from "./router-stream.ts";
import type { StreamingModelAdapter } from "./stream-adapter.ts";
import { toolsBody, toWireMessages } from "./wire-messages.ts";

export const CHATGPT_API_BASE_URL = "https://api.openai.com/v1";

export type ChatGptAdapterConfig = {
  accessToken: string;
  model: string;
  fetchImpl?: FetchLike;
} & ModelNetworkOptions;

function requestHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

/**
 * Adapter for ChatGPT Sign-in-with-ChatGPT (SIWC) OAuth tokens against
 * OpenAI's fixed `https://api.openai.com/v1/chat/completions` endpoint.
 */
export function createChatGptAdapter(
  config: ChatGptAdapterConfig,
): StreamingModelAdapter {
  const fetchImpl = config.fetchImpl ?? fetch;
  const endpoint = `${CHATGPT_API_BASE_URL}/chat/completions`;

  return {
    provider: "chatgpt",
    model: config.model,
    streamReply(request, signal) {
      const model = request.modelId ?? config.model;
      return openModelStream({
        provider: "chatgpt",
        model,
        fetchImpl,
        url: endpoint,
        headers: requestHeaders(config.accessToken),
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
        provider: "chatgpt",
        endpoint,
        model: config.model,
        headers: requestHeaders(config.accessToken),
        request,
        fetchImpl,
        network: config,
      });
    },
  };
}
