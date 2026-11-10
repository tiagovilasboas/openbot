export const DEFAULT_RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
export const MAX_TRACKED_CLIENTS = 10_000;

/** OPENBOT_RATE_LIMIT: requests per minute per IP; invalid values use the default. */
export function parseRateLimit(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_RATE_LIMIT;
}

export type RateVerdict =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** In-memory sliding window per client key. The clock is injectable for tests. */
export function createRateLimiter(
  limit: number,
  now: () => number = Date.now,
  maxTrackedClients: number = MAX_TRACKED_CLIENTS,
) {
  const hits = new Map<string, number[]>();

  // Re-inserting moves the key to the end, so the map order is recency order.
  function touch(key: string, times: number[]) {
    hits.delete(key);
    hits.set(key, times);
  }

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

  // Expired keys go first; if rotating keys still fill the map inside one
  // window, the least recently seen ones are evicted so memory stays bounded.
  function makeRoom(current: number) {
    if (hits.size < maxTrackedClients) return;
    prune(current);
    for (const key of hits.keys()) {
      if (hits.size < maxTrackedClients) break;
      hits.delete(key);
    }
  }

  return {
    check(key: string): RateVerdict {
      const current = now();
      if (!hits.has(key)) makeRoom(current);
      const recent = (hits.get(key) ?? []).filter(
        (time) => current - time < WINDOW_MS,
      );
      if (recent.length >= limit) {
        touch(key, recent);
        const retryMs = recent[0] + WINDOW_MS - current;
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)),
        };
      }
      recent.push(current);
      touch(key, recent);
      return { allowed: true };
    },
    /** Keys currently remembered, for tests. */
    trackedClients: () => hits.size,
  };
}
