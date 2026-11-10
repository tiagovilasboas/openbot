export type FrameScheduler = {
  request(run: () => void): unknown;
  cancel(handle: unknown): void;
};

const browserScheduler: FrameScheduler = {
  request: (run) =>
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame(run)
      : setTimeout(run, 16),
  cancel: (handle) =>
    typeof cancelAnimationFrame === "function"
      ? cancelAnimationFrame(handle as number)
      : clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Hands only the newest value to `apply`, at most once per frame, so a burst
 * of stream deltas costs one render. `flush` applies the pending value now;
 * `cancel` drops it (the turn ended and its result is stored another way).
 */
export function createFrameThrottle<T>(
  apply: (value: T) => void,
  scheduler: FrameScheduler = browserScheduler,
) {
  let pending: { value: T } | null = null;
  let handle: unknown = null;

  function clearHandle() {
    if (handle !== null) scheduler.cancel(handle);
    handle = null;
  }

  return {
    push(value: T) {
      pending = { value };
      if (handle === null) {
        handle = scheduler.request(() => {
          handle = null;
          const next = pending;
          pending = null;
          if (next) apply(next.value);
        });
      }
    },
    cancel() {
      clearHandle();
      pending = null;
    },
  };
}
