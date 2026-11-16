import type { Clock, PendingAuth, PendingAuthStore } from "../core/index.ts";

/** Upper bound on Connects waiting at once, so starts cannot grow memory. */
const MAX_PENDING = 64;

/**
 * Pending OAuth Connects in server process memory, which suits the single
 * `next start` process Open Bot runs as. Entries older than `retainMs` are
 * dropped on the next start; `take` hands each one out once.
 */
export function createMemoryPendingAuthStore(
  clock: Clock,
  retainMs: number,
  maxPending: number = MAX_PENDING,
): PendingAuthStore {
  const entries = new Map<string, PendingAuth>();

  function dropStale(): void {
    const now = clock();
    for (const [state, pending] of entries) {
      if (now - pending.createdAt > retainMs) entries.delete(state);
    }
    // Map keeps insertion order, so the first key is the oldest Connect.
    for (const state of entries.keys()) {
      if (entries.size < maxPending) break;
      entries.delete(state);
    }
  }

  return {
    put(state, pending) {
      dropStale();
      entries.set(state, pending);
    },
    take(state) {
      const pending = entries.get(state) ?? null;
      entries.delete(state);
      return pending;
    },
  };
}
