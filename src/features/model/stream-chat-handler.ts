import {
  noKeyLookup,
  withVaultKeys,
  type KeyLookup,
} from "../key-vault/apply-vault-keys.ts";
import { clientKey } from "../server-guard/client-key.ts";
import {
  sharedStreamSlots,
  type ReleaseSlot,
  type StreamSlots,
} from "../server-guard/stream-slots.ts";
import { modelNotAllowedResponse } from "./allowed-models.ts";
import type { FetchLike } from "./model-adapter.ts";
import { eventsToNdjson } from "./ndjson-stream.ts";
import { readIdempotencyKey } from "./idempotency-key.ts";
import { fingerprintBody } from "./send-replay.ts";
import { chatStreamReplay, type createStreamReplay } from "./stream-replay.ts";
import { parseChatRequest } from "./parse-chat-request.ts";
import { selectAdapter } from "./select-adapter.ts";
import { createStreamSignal, STREAM_TIMEOUT_MS } from "./stream-signal.ts";
import type { ChatStreamEvent } from "./stream-events.ts";
import { streamWithFailover } from "./stream-with-failover.ts";

type Env = Record<string, string | undefined>;

export type StreamChatOptions = {
  env: Env;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** In-flight stream pool; defaults to the process-wide one. */
  slots?: StreamSlots;
  /** Where a config with no key finds its saved one; none by default. */
  keyLookup?: KeyLookup;
  /** Remembers finished streams per send id; defaults to the shared one. */
  replay?: ReturnType<typeof createStreamReplay>;
};

/** Runs the events and gives the slot back however the stream ends. */
async function* releasing(
  events: AsyncGenerator<ChatStreamEvent>,
  release: ReleaseSlot,
): AsyncGenerator<ChatStreamEvent> {
  try {
    yield* events;
  } finally {
    release();
  }
}

/**
 * POST /api/chat/stream. Validation and provider selection answer with the
 * same plain JSON statuses as /api/chat; after that the response is always an
 * NDJSON event stream (see stream-events.ts), including provider failures.
 */
export async function handleChatStream(
  request: Request,
  {
    env,
    fetchImpl,
    timeoutMs = STREAM_TIMEOUT_MS,
    slots = sharedStreamSlots(env),
    keyLookup = noKeyLookup,
    replay = chatStreamReplay,
  }: StreamChatOptions,
): Promise<Response> {
  const idempotency = readIdempotencyKey(request.headers);
  if (!idempotency.ok) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseChatRequest(payload);
  if (!parsed.ok) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const notAllowed = modelNotAllowedResponse(env, parsed.request.modelId);
  if (notAllowed) return notAllowed;

  const start = () =>
    startStream(request, parsed.request, {
      env,
      fetchImpl,
      timeoutMs,
      slots,
      keyLookup,
    });
  if (!idempotency.key) return start();

  // A repeated send id replays the stored lines; only finished streams stay.
  const result = replay.run(idempotency.key, fingerprintBody(payload), start);
  if (result.kind === "conflict") {
    return Response.json({ error: "idempotency_conflict" }, { status: 409 });
  }
  return result.response;
}

type ParsedRequest = Extract<
  ReturnType<typeof parseChatRequest>,
  { ok: true }
>["request"];

type StartOptions = {
  env: Env;
  fetchImpl?: FetchLike;
  timeoutMs: number;
  slots: StreamSlots;
  keyLookup: KeyLookup;
};

/** Picks the provider, takes a slot and starts the NDJSON response. */
function startStream(
  request: Request,
  parsedRequest: ParsedRequest,
  { env, fetchImpl, timeoutMs, slots, keyLookup }: StartOptions,
): Response {
  const modelRequest = withVaultKeys(parsedRequest, keyLookup);
  const primary = selectAdapter(env, modelRequest.config, fetchImpl);
  if (!primary) {
    return Response.json({ error: "no_provider_configured" }, { status: 503 });
  }
  const fallback = modelRequest.fallbackConfig
    ? selectAdapter(env, modelRequest.fallbackConfig, fetchImpl)
    : null;

  // The slot is taken only after validation, and before any provider call.
  const release = slots.acquire(clientKey(request.headers, env));
  if (!release) {
    return Response.json(
      { error: "too_many_streams" },
      { status: 429, headers: { "Retry-After": "5" } },
    );
  }

  // The client leaving (request.signal or a cancelled body) and the overall
  // deadline both end the upstream call.
  const stop = new AbortController();
  const signal = createStreamSignal([request.signal, stop.signal], timeoutMs);
  // Backstop for a stream nobody ever reads: the deadline still frees the slot.
  if (signal.aborted) release();
  else signal.addEventListener("abort", release, { once: true });
  const events = releasing(
    streamWithFailover({
      request: modelRequest,
      primary,
      fallback,
      env,
      fetchImpl,
      signal,
    }),
    release,
  );

  return new Response(
    eventsToNdjson(events, () => {
      stop.abort();
      release();
    }),
    {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store, no-transform",
        "x-accel-buffering": "no",
      },
    },
  );
}
