/**
 * Overall bound for one streamed reply. It matches CHAT_CALL_TIMEOUT_MS on the
 * client, so both sides give up together.
 */
export const STREAM_TIMEOUT_MS = 120_000;

/** One signal that aborts when any source aborts or the deadline passes. */
export function createStreamSignal(
  sources: AbortSignal[],
  timeoutMs: number = STREAM_TIMEOUT_MS,
): AbortSignal {
  return AbortSignal.any([...sources, AbortSignal.timeout(timeoutMs)]);
}

/** Why an aborted stream signal fired: the deadline, or the caller leaving. */
export function streamAbortKind(signal: AbortSignal): "timeout" | "cancelled" {
  const reason: unknown = signal.reason;
  return reason instanceof Error && reason.name === "TimeoutError"
    ? "timeout"
    : "cancelled";
}
