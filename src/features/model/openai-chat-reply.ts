import {
  BlockedBaseUrlError,
  modelFetch,
  type ModelNetworkOptions,
} from "./guarded-model-fetch.ts";
import type { FetchLike, ModelRequest, ModelResult } from "./model-adapter.ts";
import { providerErrorDetail } from "./provider-error-detail.ts";
import { openAiUsage } from "./token-usage.ts";

export type OpenAiGenerateReplyInput = {
  provider: string;
  endpoint: string;
  model: string;
  headers: Record<string, string>;
  request: ModelRequest;
  fetchImpl: FetchLike;
  network: ModelNetworkOptions & { guardUrl?: boolean };
};

/**
 * Non-streaming OpenAI-compatible `/chat/completions` call shared by the
 * router and ChatGPT adapters. Enforces `modelFetch` (`redirect: "error"` and
 * timeout) and maps upstream errors to closed status tags without leaking text.
 */
export async function openAiGenerateReply({
  provider,
  endpoint,
  model,
  headers,
  request,
  fetchImpl,
  network,
}: OpenAiGenerateReplyInput): Promise<ModelResult> {
  let response: Response;
  try {
    response = await modelFetch(
      fetchImpl,
      endpoint,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: request.modelId ?? model,
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
      network,
    );
  } catch (error) {
    if (error instanceof BlockedBaseUrlError) {
      return { ok: false, code: "blocked_base_url", provider };
    }
    return { ok: false, code: "provider_unreachable", provider };
  }

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as {
      error?: { message?: unknown };
    } | null;
    const msg =
      typeof errorPayload?.error?.message === "string"
        ? errorPayload.error.message.trim()
        : null;
    const detail = providerErrorDetail(response.status, msg, response.headers);
    return { ok: false, code: "provider_rejected", provider, detail };
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
    const reasoning = choice?.message?.reasoning;
    return {
      ok: false,
      code: "invalid_provider_response",
      provider,
      detail:
        typeof reasoning === "string" && reasoning.trim()
          ? `${response.status}: empty_content_reasoning_only`
          : `${response.status}: empty_content`,
    };
  }
  const usage = openAiUsage(payload);
  return {
    ok: true,
    provider,
    text: content,
    ...(usage ? { usage } : {}),
  };
}
