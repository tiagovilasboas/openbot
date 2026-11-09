import { withApiHeaders } from "../server-guard/api-request-init.ts";
import {
  classifyModelFailure,
  type ModelFailure,
} from "../model/classify-model-failure.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

export type HistoryMessage = { role: "assistant" | "user"; text: string };

export type FailoverDetail = {
  fromModel: string;
  toModel: string;
  reason: string;
};

export type ModelReplyOutcome =
  | { kind: "text"; text: string; failover?: FailoverDetail }
  | { kind: "unavailable" }
  | { kind: "error"; failure: ModelFailure };

/**
 * Asks the server chat route for a model reply. "unavailable" means the server
 * has no provider configured, so callers can keep the explicit demo behavior
 * instead of pretending a model answered.
 */
export async function requestModelReply(
  language: ChatLanguage,
  messages: HistoryMessage[],
  fetchImpl: typeof fetch = fetch,
  config?: ClientModelConfig | null,
  systemPrompt?: string,
): Promise<ModelReplyOutcome> {
  let response: Response;
  try {
    response = await fetchImpl(
      "/api/chat",
      withApiHeaders({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language,
          messages,
          ...(config ? { config } : {}),
          ...(systemPrompt ? { systemPrompt } : {}),
        }),
      }),
    );
  } catch {
    return { kind: "error", failure: { kind: "unreachable" } };
  }

  const payload: unknown = await response.json().catch(() => null);
  const body = (payload ?? {}) as {
    error?: unknown;
    detail?: unknown;
    text?: unknown;
    failover?: FailoverDetail;
  };

  if (response.status === 503 && body.error === "no_provider_configured") {
    return { kind: "unavailable" };
  }
  if (response.ok && typeof body.text === "string" && body.text.trim()) {
    return {
      kind: "text",
      text: body.text,
      ...(body.failover ? { failover: body.failover } : {}),
    };
  }
  return {
    kind: "error",
    failure: classifyModelFailure(body.error, body.detail),
  };
}
