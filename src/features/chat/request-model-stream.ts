import { withApiHeaders } from "../server-guard/api-request-init.ts";
import {
  classifyFetchError,
  type ModelFailure,
} from "../model/classify-model-failure.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { readLines } from "../model/stream-lines.ts";
import { createCallSignal } from "./call-timeout.ts";
import {
  browserIsOnline,
  requestModelReply,
  type FailoverDetail,
  type HistoryMessage,
  type ModelReplyOptions,
  type ModelReplyOutcome,
} from "./request-model-reply.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { parseStreamEvent } from "./stream-event-parser.ts";

export interface ModelStreamOptions extends ModelReplyOptions {
  /** Called with the whole reply so far each time more text arrives. */
  onText?: (textSoFar: string) => void;
}

/**
 * Like a reply outcome, plus "partial": the stream broke or was cancelled
 * after some text arrived, and that text is worth keeping.
 */
export type ModelStreamOutcome =
  ModelReplyOutcome | { kind: "partial"; text: string; failure: ModelFailure };

type Settled = ModelStreamOutcome | "fallback";

function isNdjson(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").includes("ndjson");
}

/**
 * Asks /api/chat/stream for a reply and reports its text as it arrives. If the
 * stream route cannot be reached or answers with a plain error status, the
 * same request is sent once to the non-stream /api/chat, which stays the
 * source of truth for error classification.
 */
export async function requestModelStream(
  language: ChatLanguage,
  messages: HistoryMessage[],
  fetchImpl: typeof fetch = fetch,
  config?: ClientModelConfig | null,
  systemPrompt?: string,
  options: ModelStreamOptions = {},
): Promise<ModelStreamOutcome> {
  const call = createCallSignal(options.signal, options.timeoutMs);
  let settled: Settled;
  try {
    settled = await streamOnce();
  } finally {
    call.dispose();
  }
  if (settled !== "fallback") return settled;
  return requestModelReply(
    language,
    messages,
    fetchImpl,
    config,
    systemPrompt,
    options,
  );

  function failureOfThrow(): ModelFailure {
    return classifyFetchError({
      cancelled: call.cancelled(),
      timedOut: call.timedOut(),
      online: (options.isOnline ?? browserIsOnline)(),
    });
  }

  async function streamOnce(): Promise<Settled> {
    let response: Response;
    try {
      response = await fetchImpl(
        "/api/chat/stream",
        withApiHeaders({
          method: "POST",
          signal: call.signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            language,
            messages,
            ...(config ? { config } : {}),
            ...(systemPrompt ? { systemPrompt } : {}),
            ...(options.modelId ? { modelId: options.modelId } : {}),
          }),
        }),
      );
    } catch {
      // A cancel or timeout is final; anything else gets the plain route.
      return call.cancelled() || call.timedOut()
        ? { kind: "error", failure: failureOfThrow() }
        : "fallback";
    }
    if (!response.ok || !response.body || !isNdjson(response)) {
      await response.body?.cancel().catch(() => undefined);
      return "fallback";
    }
    return readReply(response.body);
  }

  async function readReply(
    body: ReadableStream<Uint8Array>,
  ): Promise<ModelStreamOutcome> {
    let text = "";
    let failover: FailoverDetail | undefined;
    let finished = false;
    // A stream that ends with neither done nor error was cut off.
    let failure: ModelFailure = { kind: "unreachable" };
    try {
      for await (const line of readLines(body)) {
        const event = parseStreamEvent(line);
        if (event?.type === "delta") {
          text += event.text;
          options.onText?.(text);
        } else if (event?.type === "done") {
          finished = true;
          failover = event.failover;
          break;
        } else if (event?.type === "error") {
          failure = {
            kind: event.code,
            ...(event.status ? { status: event.status } : {}),
          };
          break;
        }
      }
    } catch {
      failure = failureOfThrow();
    }
    const hasText = text.trim() !== "";
    if (finished) {
      return hasText
        ? { kind: "text", text, ...(failover ? { failover } : {}) }
        : { kind: "error", failure: { kind: "unknown" } };
    }
    return hasText
      ? { kind: "partial", text, failure }
      : { kind: "error", failure };
  }
}
