import { withApiHeaders } from "../server-guard/api-request-init.ts";
import {
  classifyFetchError,
  type ModelFailure,
} from "../model/classify-model-failure.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { fitReplyChunk, MAX_REPLY_CHARS } from "../model/reply-limit.ts";
import { readLines, StreamTooLargeError } from "../model/stream-lines.ts";
import type { TokenUsage } from "../model/token-usage.ts";
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
import { parseTurnEvent } from "./stream-event-parser.ts";
import {
  streamRouteFor,
  toolRequestFields,
  type ToolTurnRequest,
} from "../tools/client/tool-route.ts";
import type {
  ApprovalPause,
  ToolProgressEvent,
} from "../tools/client/tool-stream-events.ts";

export interface ModelStreamOptions extends ModelReplyOptions {
  /** Called with the whole reply so far each time more text arrives. */
  onText?: (textSoFar: string) => void;
  /** Most characters kept from one reply; defaults to MAX_REPLY_CHARS. */
  maxReplyChars?: number;
  /** Sends the turn through the tool route, for a bot that opted in. */
  tools?: ToolTurnRequest;
  /** Hears each tool event of the turn as it arrives. */
  onToolEvent?: (event: ToolProgressEvent) => void;
}

/**
 * Like a reply outcome, plus "partial": the stream broke or was cancelled
 * after some text arrived, and that text is worth keeping. A tool turn may
 * also stop for the user ("approval"), and a resume the server no longer
 * accepts is "resume_refused", never sent anywhere else.
 */
export type ModelStreamOutcome =
  | ModelReplyOutcome
  | { kind: "partial"; text: string; failure: ModelFailure }
  | { kind: "approval"; text: string; pause: ApprovalPause }
  | { kind: "resume_refused"; status: number };

type Settled = ModelStreamOutcome | "fallback";

/** Tools off (404), another request (409), expired or claimed (410). */
const RESUME_GONE = new Set([404, 409, 410]);

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
    // A resume is bound to the paused turn: it never falls back to /api/chat.
    const resuming = Boolean(options.tools?.resume);
    let response: Response;
    try {
      response = await fetchImpl(
        streamRouteFor(options.tools),
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
            ...(options.memory && options.memory.length > 0
              ? { memory: options.memory }
              : {}),
            ...(options.attachments && options.attachments.length > 0
              ? { attachments: options.attachments }
              : {}),
            ...toolRequestFields(options.tools),
          }),
        }),
      );
    } catch {
      // A cancel or timeout is final; anything else gets the plain route.
      return call.cancelled() || call.timedOut() || resuming
        ? { kind: "error", failure: failureOfThrow() }
        : "fallback";
    }
    if (!response.ok || !response.body || !isNdjson(response)) {
      await response.body?.cancel().catch(() => undefined);
      if (!resuming) return "fallback";
      return RESUME_GONE.has(response.status)
        ? { kind: "resume_refused", status: response.status }
        : {
            kind: "error",
            failure: { kind: "server", status: response.status },
          };
    }
    return readReply(response.body);
  }

  async function readReply(
    body: ReadableStream<Uint8Array>,
  ): Promise<ModelStreamOutcome> {
    let text = "";
    let failover: FailoverDetail | undefined;
    let usage: TokenUsage | undefined;
    let finished = false;
    let pause: ApprovalPause | undefined;
    // A stream that ends with neither done nor error was cut off.
    let failure: ModelFailure = { kind: "unreachable" };
    try {
      for await (const line of readLines(body)) {
        const event = parseTurnEvent(line);
        if (event?.type === "approval_required") {
          const { turnId, calls, expiresAt } = event;
          pause = { turnId, calls, expiresAt };
          break;
        } else if (
          event?.type === "tool_call" ||
          event?.type === "tool_result" ||
          event?.type === "tools_unavailable" ||
          event?.type === "memory_changed"
        ) {
          options.onToolEvent?.(event);
        } else if (event?.type === "delta") {
          // The server caps replies too; this keeps a hostile upstream from
          // filling memory and localStorage through a proxy that does not.
          const fit = fitReplyChunk(
            text.length,
            event.text,
            options.maxReplyChars ?? MAX_REPLY_CHARS,
          );
          text += fit.text;
          if (fit.text) options.onText?.(text);
          if (fit.exceeded) {
            failure = { kind: "response_too_long" };
            break;
          }
        } else if (event?.type === "done") {
          finished = true;
          failover = event.failover;
          usage = event.usage;
          break;
        } else if (event?.type === "error") {
          failure = {
            kind: event.code,
            ...(event.status ? { status: event.status } : {}),
          };
          break;
        }
      }
    } catch (error) {
      failure =
        error instanceof StreamTooLargeError
          ? { kind: "response_too_long" }
          : failureOfThrow();
    }
    if (pause) return { kind: "approval", text, pause };
    const hasText = text.trim() !== "";
    if (finished) {
      return hasText
        ? {
            kind: "text",
            text,
            ...(failover ? { failover } : {}),
            ...(usage ? { usage } : {}),
          }
        : { kind: "error", failure: { kind: "unknown" } };
    }
    return hasText
      ? { kind: "partial", text, failure }
      : { kind: "error", failure };
  }
}
