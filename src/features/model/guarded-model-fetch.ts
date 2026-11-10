import { checkBaseUrl, type HostResolver } from "./base-url-guard.ts";
import type { FetchLike } from "./model-adapter.ts";

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
 * When `guardUrl` is set the URL comes from a client and is checked first.
 */
export async function modelFetch(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  options: ModelNetworkOptions & { guardUrl?: boolean },
): Promise<Response> {
  if (options.guardUrl) {
    const verdict = await checkBaseUrl(url, options.resolver);
    if (!verdict.ok) throw new BlockedBaseUrlError();
  }
  return fetchImpl(url, {
    ...init,
    redirect: "error",
    // A caller-supplied signal (streaming) owns the deadline.
    signal:
      init.signal ?? AbortSignal.timeout(options.timeoutMs ?? CHAT_TIMEOUT_MS),
  });
}
