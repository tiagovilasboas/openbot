/** Key used for every caller when no trusted proxy tells us who is calling. */
export const SHARED_CLIENT_KEY = "shared";

const MAX_KEY_LENGTH = 64;

/** Reads OPENBOT_TRUST_PROXY. */
export type ClientKeyEnv = Record<string, string | undefined>;

export function trustsProxy(env: ClientKeyEnv): boolean {
  return env.OPENBOT_TRUST_PROXY === "1";
}

/**
 * The key the rate limiter and the stream slots count a caller under.
 *
 * Next fills `X-Forwarded-For` with the socket address only when the header is
 * missing (`??=`), so a value that is there cannot be told apart from one the
 * caller invented, and Next exposes no separate peer address to the proxy. So
 * by default every caller shares one bucket: a rotating header buys nothing.
 *
 * Behind a reverse proxy you control, set OPENBOT_TRUST_PROXY=1. The key is
 * then the LAST X-Forwarded-For hop, the address your proxy appended for the
 * connection it accepted. Earlier hops are caller supplied and are ignored.
 * Only enable it when the proxy always sets or appends the header and the app
 * is not reachable except through it.
 *
 * Tradeoff: without the flag, all callers share the per-minute budget and the
 * stream slots. That fits a personal install; shared hosting needs the flag.
 */
export function clientKey(headers: Headers, env: ClientKeyEnv): string {
  if (!trustsProxy(env)) return SHARED_CLIENT_KEY;
  const hops = headers.get("x-forwarded-for")?.split(",") ?? [];
  const last = hops[hops.length - 1]?.trim();
  if (!last || last.length > MAX_KEY_LENGTH) return SHARED_CLIENT_KEY;
  return last;
}
