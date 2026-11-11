import { checkAccessToken } from "./check-access-token.ts";
import { checkBodySize } from "./check-body-size.ts";
import { checkOrigin } from "./check-origin.ts";
import type { GuardDecision } from "./guard-types.ts";
import { createRateLimiter, parseRateLimit } from "./rate-limiter.ts";

/** Reads OPENBOT_RATE_LIMIT and OPENBOT_ACCESS_TOKEN. */
export type GuardEnv = Record<string, string | undefined>;

export type GuardInput = {
  method: string;
  headers: Headers;
  /** Rate-limit key (see client-key.ts). */
  ip: string;
  /** The caller's address for the loopback check; undefined when unknown. */
  address?: string;
};

/**
 * Builds the single gate for /api/*. Order: cheap structural checks first
 * (origin, token, size), the rate limit last so refused requests do not
 * consume a legitimate caller's budget.
 */
export function createRequestGuard(
  env: GuardEnv,
  now: () => number = Date.now,
) {
  const limiter = createRateLimiter(
    parseRateLimit(env.OPENBOT_RATE_LIMIT),
    now,
  );
  const token = env.OPENBOT_ACCESS_TOKEN || undefined;

  return function guard({
    method,
    headers,
    ip,
    address,
  }: GuardInput): GuardDecision {
    const origin = checkOrigin(headers);
    if (!origin.ok) return origin;
    const auth = checkAccessToken(headers, token, address);
    if (!auth.ok) return auth;
    if (method !== "GET" && method !== "HEAD") {
      const size = checkBodySize(headers);
      if (!size.ok) return size;
    }
    const verdict = limiter.check(ip);
    if (!verdict.allowed) {
      return {
        ok: false,
        status: 429,
        error: "rate_limited",
        retryAfterSeconds: verdict.retryAfterSeconds,
      };
    }
    return { ok: true };
  };
}
