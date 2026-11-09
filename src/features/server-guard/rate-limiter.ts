export const DEFAULT_RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
const MAX_TRACKED_CLIENTS = 10_000;

/** OPENBOT_RATE_LIMIT: requests per minute per IP; invalid values use the default. */
export function parseRateLimit(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_RATE_LIMIT;
}

export type RateVerdict =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** In-memory sliding window per client key. The clock is injectable for tests. */
export function createRateLimiter(limit: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();

  function prune(current: number) {
    for (const [key, times] of hits) {
      if (
        times.length === 0 ||
        current - times[times.length - 1] >= WINDOW_MS
      ) {
        hits.delete(key);
      }
    }
  }

  return {
    check(key: string): RateVerdict {
      const current = now();
      if (hits.size >= MAX_TRACKED_CLIENTS) prune(current);
      const recent = (hits.get(key) ?? []).filter(
        (time) => current - time < WINDOW_MS,
      );
      if (recent.length >= limit) {
        hits.set(key, recent);
        const retryMs = recent[0] + WINDOW_MS - current;
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)),
        };
      }
      recent.push(current);
      hits.set(key, recent);
      return { allowed: true };
    },
  };
}
