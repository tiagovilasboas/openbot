import {
  BlockedBaseUrlError,
  CHAT_TIMEOUT_MS,
  modelFetch,
  type ModelNetworkOptions,
} from "./guarded-model-fetch.ts";
import type { FetchLike } from "./model-adapter.ts";
import { providerErrorDetail } from "./provider-error-detail.ts";
import type { ModelStreamChunk, ModelStreamOpen } from "./stream-adapter.ts";
import { asRecord, readLines } from "./stream-lines.ts";

export type OpenModelStreamInput = {
  provider: string;
  model?: string;
  fetchImpl: FetchLike;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  /** timeoutMs bounds the wait for response headers, not the whole stream. */
  network: ModelNetworkOptions & { guardUrl?: boolean };
  signal?: AbortSignal;
  parse: (lines: AsyncIterable<string>) => AsyncIterable<ModelStreamChunk>;
};

async function* chunksOf(
  body: ReadableStream<Uint8Array>,
  parse: OpenModelStreamInput["parse"],
  signal: AbortSignal | undefined,
): AsyncGenerator<ModelStreamChunk> {
  try {
    yield* parse(readLines(body));
  } catch {
    // An abort ends the stream quietly; the caller knows why it aborted.
    if (!signal?.aborted) {
      yield { type: "failed", code: "provider_unreachable" };
    }
  }
}

/**
 * The shared half of every streaming adapter: guarded fetch, header-phase
 * timeout, status handling with the same fixed error vocabulary as the
 * non-stream path, then the provider parser over the response lines.
 */
export async function openModelStream(
  input: OpenModelStreamInput,
): Promise<ModelStreamOpen> {
  const { provider, model, signal } = input;
  // The overall deadline travels in `signal`; this one only covers connecting.
  const connect = new AbortController();
  const timer = setTimeout(
    () => connect.abort(),
    input.network.timeoutMs ?? CHAT_TIMEOUT_MS,
  );
  let response: Response;
  try {
    response = await modelFetch(
      input.fetchImpl,
      input.url,
      {
        method: "POST",
        headers: input.headers,
        body: JSON.stringify(input.body),
        signal: signal
          ? AbortSignal.any([signal, connect.signal])
          : connect.signal,
      },
      input.network,
    );
  } catch (error) {
    if (error instanceof BlockedBaseUrlError) {
      return { ok: false, code: "blocked_base_url", provider };
    }
    return { ok: false, code: "provider_unreachable", provider };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = asRecord(asRecord(payload)?.error)?.message;
    return {
      ok: false,
      code: "provider_rejected",
      provider,
      detail: providerErrorDetail(
        response.status,
        typeof message === "string" ? message.trim() : null,
      ),
    };
  }
  if (!response.body) {
    return { ok: false, code: "invalid_provider_response", provider };
  }
  return {
    ok: true,
    provider,
    model,
    chunks: chunksOf(response.body, input.parse, signal),
  };
}
