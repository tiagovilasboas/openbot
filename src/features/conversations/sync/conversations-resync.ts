/** Re-runs the conversations load when the user comes back to the tab. */

export const RESYNC_MIN_INTERVAL_MS = 30_000;

export interface ResyncDeps {
  /** One full load of the conversations; never rejects. */
  load(): Promise<void>;
  now(): number;
  minIntervalMs?: number;
}

export interface Resync {
  /** The page's first load: shared, and it starts the throttle window. */
  first(): Promise<void>;
  /** A focus or visibility trigger; true when it started a load. */
  trigger(): boolean;
}

export function createResync(deps: ResyncDeps): Resync {
  const minInterval = deps.minIntervalMs ?? RESYNC_MIN_INTERVAL_MS;
  let inFlight: Promise<void> | null = null;
  let lastStart = Number.NEGATIVE_INFINITY;
  let firstLoad: Promise<void> | null = null;

  function start(): Promise<void> {
    lastStart = deps.now();
    const run: Promise<void> = deps.load().finally(() => {
      if (inFlight === run) inFlight = null;
    });
    inFlight = run;
    return run;
  }

  return {
    first: () => (firstLoad ??= start()),
    trigger() {
      if (inFlight) return false;
      if (deps.now() - lastStart < minInterval) return false;
      void start().catch(() => undefined);
      return true;
    },
  };
}
