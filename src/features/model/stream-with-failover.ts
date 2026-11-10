import { classifyModelFailure } from "./classify-model-failure.ts";
import { resolveAutoFallbackAdapter } from "./failover-runner.ts";
import type {
  FailoverInfo,
  FetchLike,
  ModelErrorCode,
  ModelRequest,
} from "./model-adapter.ts";
import type {
  ModelStreamChunk,
  StreamUsage,
  StreamingModelAdapter,
} from "./stream-adapter.ts";
import type { ChatStreamEvent } from "./stream-events.ts";
import { streamAbortKind } from "./stream-signal.ts";

export interface StreamWithFailoverOptions {
  request: ModelRequest;
  primary: StreamingModelAdapter;
  fallback?: StreamingModelAdapter | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  signal: AbortSignal;
}

/** Later counts win, but a missing count never erases an earlier one. */
function mergeUsage(into: StreamUsage, more: StreamUsage): StreamUsage {
  return {
    inputTokens: more.inputTokens ?? into.inputTokens,
    outputTokens: more.outputTokens ?? into.outputTokens,
  };
}

type Attempt =
  | {
      kind: "ready";
      adapter: StreamingModelAdapter;
      firstText: string;
      usage: StreamUsage;
      rest: AsyncIterator<ModelStreamChunk>;
    }
  | {
      kind: "failed";
      code: ModelErrorCode;
      provider: string | null;
      detail?: string;
    }
  | { kind: "aborted" };

/**
 * Opens one adapter and waits for its first text. Anything that goes wrong
 * before that (open failure, error chunk, empty reply) is a plain failure,
 * which is the only case where failing over is still invisible to the user.
 */
async function startAttempt(
  adapter: StreamingModelAdapter,
  request: ModelRequest,
  signal: AbortSignal,
): Promise<Attempt> {
  const open = await adapter.streamReply(request, signal);
  if (signal.aborted) return { kind: "aborted" };
  if (!open.ok) {
    return {
      kind: "failed",
      code: open.code,
      provider: open.provider,
      detail: open.detail,
    };
  }
  const rest = open.chunks[Symbol.asyncIterator]();
  let usage: StreamUsage = {};
  for (;;) {
    const next = await rest.next();
    if (signal.aborted) {
      await rest.return?.();
      return { kind: "aborted" };
    }
    const chunk = next.done ? null : next.value;
    if (chunk?.type === "delta") {
      return { kind: "ready", adapter, firstText: chunk.text, usage, rest };
    }
    if (chunk?.type === "usage") {
      usage = mergeUsage(usage, chunk.usage);
      continue;
    }
    await rest.return?.();
    return chunk?.type === "failed"
      ? {
          kind: "failed",
          code: chunk.code,
          provider: open.provider,
          detail: chunk.detail,
        }
      : {
          kind: "failed",
          code: "invalid_provider_response",
          provider: open.provider,
        };
  }
}

function errorEvent(
  code: ModelErrorCode,
  provider: string | null,
  detail?: string,
): ChatStreamEvent {
  const failure = classifyModelFailure(code, detail);
  return {
    type: "error",
    code: failure.kind,
    provider,
    ...(failure.status ? { status: failure.status } : {}),
  };
}

/** What to say when the signal fired: nothing if the client left, else a timeout. */
function abortEvents(signal: AbortSignal): ChatStreamEvent[] {
  return streamAbortKind(signal) === "timeout"
    ? [{ type: "error", code: "timeout", provider: null }]
    : [];
}

/**
 * Streams one reply as typed events. Failover (the configured fallback or the
 * automatic router fallback) runs only until the first text arrives; once a
 * delta is out, a failure is reported as an `error` event and the client keeps
 * what it already has.
 */
export async function* streamWithFailover(
  options: StreamWithFailoverOptions,
): AsyncGenerator<ChatStreamEvent> {
  const { request, primary, signal } = options;
  let attempt = await startAttempt(primary, request, signal);
  let failover: FailoverInfo | undefined;

  if (attempt.kind === "failed" && attempt.code !== "blocked_base_url") {
    const secondary =
      options.fallback ??
      resolveAutoFallbackAdapter(
        primary,
        request,
        options.env,
        options.fetchImpl,
      );
    if (secondary) {
      const first = attempt;
      // The bot's model id belongs to the primary provider, not the fallback.
      const { modelId: _primaryModelId, ...fallbackRequest } = request;
      const second = await startAttempt(secondary, fallbackRequest, signal);
      if (second.kind === "ready") {
        failover = {
          fromModel: primary.model ?? primary.provider,
          toModel: secondary.model ?? secondary.provider,
          reason: first.detail ?? first.code,
        };
      }
      attempt =
        second.kind === "failed"
          ? { ...second, detail: second.detail ?? first.detail }
          : second;
    }
  }

  if (attempt.kind === "aborted") {
    yield* abortEvents(signal);
    return;
  }
  if (attempt.kind === "failed") {
    yield errorEvent(attempt.code, attempt.provider, attempt.detail);
    return;
  }

  const { adapter, rest } = attempt;
  let usage = attempt.usage;
  try {
    yield { type: "start", provider: adapter.provider, model: adapter.model };
    yield { type: "delta", text: attempt.firstText };
    for (;;) {
      const next = await rest.next();
      if (signal.aborted) {
        yield* abortEvents(signal);
        return;
      }
      if (next.done) break;
      const chunk = next.value;
      if (chunk.type === "delta") {
        yield { type: "delta", text: chunk.text };
      } else if (chunk.type === "usage") {
        usage = mergeUsage(usage, chunk.usage);
      } else {
        yield errorEvent(chunk.code, adapter.provider, chunk.detail);
        return;
      }
    }
    const hasUsage = Object.values(usage).some((value) => value !== undefined);
    yield {
      type: "done",
      provider: adapter.provider,
      model: adapter.model,
      ...(failover ? { failover } : {}),
      ...(hasUsage ? { usage } : {}),
    };
  } finally {
    await rest.return?.();
  }
}
