import type { FetchLike } from "./model-adapter.ts";
import { eventsToNdjson } from "./ndjson-stream.ts";
import { parseChatRequest } from "./parse-chat-request.ts";
import { selectAdapter } from "./select-adapter.ts";
import { createStreamSignal, STREAM_TIMEOUT_MS } from "./stream-signal.ts";
import { streamWithFailover } from "./stream-with-failover.ts";

type Env = Record<string, string | undefined>;

export type StreamChatOptions = {
  env: Env;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

/**
 * POST /api/chat/stream. Validation and provider selection answer with the
 * same plain JSON statuses as /api/chat; after that the response is always an
 * NDJSON event stream (see stream-events.ts), including provider failures.
 */
export async function handleChatStream(
  request: Request,
  { env, fetchImpl, timeoutMs = STREAM_TIMEOUT_MS }: StreamChatOptions,
): Promise<Response> {
  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseChatRequest(payload);
  if (!parsed.ok) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const primary = selectAdapter(env, parsed.request.config, fetchImpl);
  if (!primary) {
    return Response.json({ error: "no_provider_configured" }, { status: 503 });
  }
  const fallback = parsed.request.fallbackConfig
    ? selectAdapter(env, parsed.request.fallbackConfig, fetchImpl)
    : null;

  // The client leaving (request.signal or a cancelled body) and the overall
  // deadline both end the upstream call.
  const stop = new AbortController();
  const signal = createStreamSignal([request.signal, stop.signal], timeoutMs);
  const events = streamWithFailover({
    request: parsed.request,
    primary,
    fallback,
    env,
    fetchImpl,
    signal,
  });

  return new Response(
    eventsToNdjson(events, () => stop.abort()),
    {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store, no-transform",
        "x-accel-buffering": "no",
      },
    },
  );
}
