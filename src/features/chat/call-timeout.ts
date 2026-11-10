/** How long one model call may take before the chat gives up on it. */
export const CHAT_CALL_TIMEOUT_MS = 120_000;

export interface CallSignal {
  signal: AbortSignal;
  /** True when the time limit, not the user, ended the call. */
  timedOut(): boolean;
  /** True when the user's own signal ended the call. */
  cancelled(): boolean;
  /** Always call when the call settles, so the timer never outlives it. */
  dispose(): void;
}

/**
 * One signal for one call: it aborts when the user cancels or when the call
 * runs past its own time limit. Each call of a delegated turn gets a fresh one,
 * so the limit never adds up across the crew.
 */
export function createCallSignal(
  userSignal?: AbortSignal,
  timeoutMs: number = CHAT_CALL_TIMEOUT_MS,
): CallSignal {
  const controller = new AbortController();
  let timedOut = false;
  const onUserAbort = () => controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (userSignal?.aborted) controller.abort();
  else userSignal?.addEventListener("abort", onUserAbort, { once: true });

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cancelled: () => Boolean(userSignal?.aborted),
    dispose() {
      clearTimeout(timer);
      userSignal?.removeEventListener("abort", onUserAbort);
    },
  };
}
