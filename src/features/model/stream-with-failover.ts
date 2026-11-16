import { logFailover } from "./failover-log.ts";
import { classifyModelFailure } from "./classify-model-failure.ts";
import { resolveAutoFallbackAdapter } from "./failover-runner.ts";
import { usableBackupModelIds } from "./backup-models.ts";
import { failoverInfoFor } from "./usage-limit-reset.ts";
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
import { fitReplyChunk, MAX_REPLY_CHARS } from "./reply-limit.ts";
import type { ChatStreamEvent } from "./stream-events.ts";
import { streamAbortKind } from "./stream-signal.ts";

export interface StreamWithFailoverOptions {
  request: ModelRequest;
  primary: StreamingModelAdapter;
  fallback?: StreamingModelAdapter | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  signal: AbortSignal;
  /** Most characters of one reply; defaults to MAX_REPLY_CHARS. */
  maxReplyChars?: number;
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
      first: Extract<ModelStreamChunk, { type: "delta" | "tool_call" }>;
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
    // A step is ready at its first text or its first tool call.
    if (chunk?.type === "delta" || chunk?.type === "tool_call") {
      return { kind: "ready", adapter, first: chunk, usage, rest };
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
    ...(failure.resetSeconds ? { resetSeconds: failure.resetSeconds } : {}),
  };
}

type BackedUp = { attempt: Attempt; failover?: FailoverInfo };

/**
 * Tries the bot's backup models in order on the primary adapter. Returns the
 * first one that answers (or an abort), or null when none did, so the generic
 * fallbacks still run. Each model is tried once: there is no retry loop.
 */
async function tryBackupModels(
  primary: StreamingModelAdapter,
  request: ModelRequest,
  first: Extract<Attempt, { kind: "failed" }>,
  options: StreamWithFailoverOptions,
): Promise<BackedUp | null> {
  const failedModel = request.modelId ?? primary.model;
  const backups = usableBackupModelIds(
    request.backupModelIds,
    failedModel,
    options.env ?? {},
  );
  for (const modelId of backups) {
    const next = await startAttempt(
      primary,
      { ...request, modelId },
      options.signal,
    );
    if (next.kind === "aborted") return { attempt: next };
    if (next.kind === "ready") {
      const failover = failoverInfoFor(
        failedModel ?? primary.provider,
        modelId,
        first.detail ?? first.code,
      );
      logFailover(failover);
      return { attempt: next, failover };
    }
    if (next.code === "blocked_base_url") return null;
  }
  return null;
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
    // The bot's backup models come first: same provider, another model.
    // A usage limit is not waited out; the next model answers instead.
    const backedUp = await tryBackupModels(primary, request, attempt, options);
    if (backedUp) {
      attempt = backedUp.attempt;
      failover = backedUp.failover;
    }
  }

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
      const {
        modelId: _primaryModelId,
        backupModelIds: _backups,
        ...fallbackRequest
      } = request;
      const second = await startAttempt(secondary, fallbackRequest, signal);
      if (second.kind === "ready") {
        failover = failoverInfoFor(
          primary.model ?? primary.provider,
          secondary.model ?? secondary.provider,
          first.detail ?? first.code,
        );
        logFailover(failover);
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
  const maxChars = options.maxReplyChars ?? MAX_REPLY_CHARS;
  let chars = 0;
  try {
    yield { type: "start", provider: adapter.provider, model: adapter.model };
    if (attempt.first.type === "tool_call") {
      yield attempt.first;
    } else {
      const first = fitReplyChunk(chars, attempt.first.text, maxChars);
      yield { type: "delta", text: first.text };
      if (first.exceeded) {
        yield errorEvent("response_too_long", adapter.provider);
        return;
      }
      chars += first.text.length;
    }
    for (;;) {
      const next = await rest.next();
      if (signal.aborted) {
        yield* abortEvents(signal);
        return;
      }
      if (next.done) break;
      const chunk = next.value;
      if (chunk.type === "delta") {
        // Past the cap the reply ends here, with what fits kept as partial.
        const fit = fitReplyChunk(chars, chunk.text, maxChars);
        if (fit.text) yield { type: "delta", text: fit.text };
        if (fit.exceeded) {
          yield errorEvent("response_too_long", adapter.provider);
          return;
        }
        chars += fit.text.length;
      } else if (chunk.type === "tool_call") {
        yield chunk;
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
