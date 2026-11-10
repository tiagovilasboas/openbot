export const DEFAULT_STREAMS_PER_CLIENT = 4;
export const DEFAULT_STREAMS_GLOBAL = 20;

/** Reads OPENBOT_STREAMS_PER_CLIENT and OPENBOT_STREAMS_GLOBAL. */
export type StreamSlotsEnv = Record<string, string | undefined>;

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** Returns the slot to its pool. Safe to call more than once. */
export type ReleaseSlot = () => void;

export interface StreamSlots {
  /** A release function, or null when the caller or the server is full. */
  acquire(key: string): ReleaseSlot | null;
  /** Streams currently open, for tests and diagnostics. */
  open(): number;
}

/**
 * Counts replies that are streaming right now. The rate limiter only counts
 * request starts, so a caller could otherwise hold many two-minute streams at
 * once. State is per process, like the rate limiter.
 */
export function createStreamSlots(limits: {
  perClient: number;
  global: number;
}): StreamSlots {
  const perKey = new Map<string, number>();
  let total = 0;

  return {
    acquire(key) {
      const mine = perKey.get(key) ?? 0;
      if (mine >= limits.perClient || total >= limits.global) return null;
      perKey.set(key, mine + 1);
      total += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        total -= 1;
        const left = (perKey.get(key) ?? 1) - 1;
        if (left <= 0) perKey.delete(key);
        else perKey.set(key, left);
      };
    },
    open: () => total,
  };
}

export function streamSlotsFromEnv(env: StreamSlotsEnv): StreamSlots {
  return createStreamSlots({
    perClient: positiveInt(
      env.OPENBOT_STREAMS_PER_CLIENT,
      DEFAULT_STREAMS_PER_CLIENT,
    ),
    global: positiveInt(env.OPENBOT_STREAMS_GLOBAL, DEFAULT_STREAMS_GLOBAL),
  });
}

let shared: StreamSlots | undefined;

/** The one pool for this server process, built from the env on first use. */
export function sharedStreamSlots(env: StreamSlotsEnv): StreamSlots {
  shared ??= streamSlotsFromEnv(env);
  return shared;
}
