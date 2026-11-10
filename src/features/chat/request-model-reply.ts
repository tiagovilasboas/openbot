import { withApiHeaders } from "../server-guard/api-request-init.ts";
import {
  classifyFetchError,
  classifyModelFailure,
  type ModelFailure,
} from "../model/classify-model-failure.ts";
import type { AttachmentPayload } from "../attachments/parse-attachments.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { readTokenUsage, type TokenUsage } from "../model/token-usage.ts";
import { createCallSignal } from "./call-timeout.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

export interface ModelReplyOptions {
  /** The user's cancel signal for the whole turn. */
  signal?: AbortSignal;
  /** Time limit for this one call; defaults to 120 s. */
  timeoutMs?: number;
  /** The bot's own model; empty means the global model setting. */
  modelId?: string;
  /** The bot's memory notes, raw: the server delimits them as data. */
  memory?: string[];
  /** Files of this turn, raw: the server delimits them as data. */
  attachments?: AttachmentPayload[];
  /** Tells offline from unreachable; defaults to navigator.onLine. */
  isOnline?: () => boolean;
}

export function browserIsOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

export type HistoryMessage = { role: "assistant" | "user"; text: string };

export type FailoverDetail = {
  fromModel: string;
  toModel: string;
  reason: string;
};

export type ModelReplyOutcome =
  | {
      kind: "text";
      text: string;
      failover?: FailoverDetail;
      /** What the provider reported; absent when it reported nothing. */
      usage?: TokenUsage;
    }
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
  options: ModelReplyOptions = {},
): Promise<ModelReplyOutcome> {
  const call = createCallSignal(options.signal, options.timeoutMs);
  const failureOfThrow = () =>
    classifyFetchError({
      cancelled: call.cancelled(),
      timedOut: call.timedOut(),
      online: (options.isOnline ?? browserIsOnline)(),
    });
  try {
    return await fetchReply(
      language,
      messages,
      fetchImpl,
      config,
      systemPrompt,
      call.signal,
      failureOfThrow,
      options.modelId,
      options.memory,
      options.attachments,
    );
  } finally {
    call.dispose();
  }
}

async function fetchReply(
  language: ChatLanguage,
  messages: HistoryMessage[],
  fetchImpl: typeof fetch,
  config: ClientModelConfig | null | undefined,
  systemPrompt: string | undefined,
  signal: AbortSignal,
  failureOfThrow: () => ModelFailure,
  modelId?: string,
  memory?: string[],
  attachments?: AttachmentPayload[],
): Promise<ModelReplyOutcome> {
  let response: Response;
  try {
    response = await fetchImpl(
      "/api/chat",
      withApiHeaders({
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language,
          messages,
          ...(config ? { config } : {}),
          ...(systemPrompt ? { systemPrompt } : {}),
          ...(modelId ? { modelId } : {}),
          ...(memory && memory.length > 0 ? { memory } : {}),
          ...(attachments && attachments.length > 0 ? { attachments } : {}),
        }),
      }),
    );
  } catch {
    return { kind: "error", failure: failureOfThrow() };
  }

  // The body is read under the same signal, so a stalled stream times out too.
  const payload: unknown = await response.json().catch(() => null);
  if (signal.aborted) return { kind: "error", failure: failureOfThrow() };
  const body = (payload ?? {}) as {
    error?: unknown;
    detail?: unknown;
    text?: unknown;
    failover?: FailoverDetail;
    usage?: unknown;
  };

  if (response.status === 503 && body.error === "no_provider_configured") {
    return { kind: "unavailable" };
  }
  if (response.ok && typeof body.text === "string" && body.text.trim()) {
    const usage = readTokenUsage(body.usage);
    return {
      kind: "text",
      text: body.text,
      ...(body.failover ? { failover: body.failover } : {}),
      ...(usage ? { usage } : {}),
    };
  }
  return {
    kind: "error",
    failure: classifyModelFailure(body.error, body.detail, response.status),
  };
}
