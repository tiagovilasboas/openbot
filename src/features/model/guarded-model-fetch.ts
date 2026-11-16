import { checkBaseUrl, type HostResolver } from "./base-url-guard.ts";
import type { FetchLike } from "./model-adapter.ts";
import { pinnedDispatcher } from "./pinned-dispatcher.ts";

export const CHAT_TIMEOUT_MS = 30_000;
export const TEST_TIMEOUT_MS = 15_000;

export type ModelNetworkOptions = {
  timeoutMs?: number;
  resolver?: HostResolver;
};

export class BlockedBaseUrlError extends Error {
  constructor() {
    super("blocked_base_url");
  }
}

/**
 * The single way adapters call a model endpoint: redirects are refused
 * (a redirect could point past the guard) and every call has a timeout.
 * When `guardUrl` is set the URL comes from a client: it is checked first
 * and the connection is pinned to the addresses that passed the check.
 */
export async function modelFetch(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  options: ModelNetworkOptions & { guardUrl?: boolean },
): Promise<Response> {
  let dispatcher: object | null = null;
  if (options.guardUrl) {
    const verdict = await checkBaseUrl(url, options.resolver);
    if (!verdict.ok) throw new BlockedBaseUrlError();
    dispatcher = verdict.pin && pinnedDispatcher(verdict.pin);
  }
  const request: RequestInit & { dispatcher?: object } = {
    ...init,
    redirect: "error",
    // A caller-supplied signal (streaming) owns the deadline.
    signal:
      init.signal ?? AbortSignal.timeout(options.timeoutMs ?? CHAT_TIMEOUT_MS),
    ...(dispatcher ? { dispatcher } : {}),
  };
  return fetchImpl(url, request);
}
