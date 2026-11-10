/**
 * Resolves with the work's result, or with "cancelled" the moment the signal
 * aborts. Work that cannot be aborted (GitHub, summaries) is simply
 * abandoned: its late result is ignored.
 */
export function raceCancel<T>(
  signal: AbortSignal,
  work: Promise<T>,
): Promise<T | "cancelled"> {
  if (signal.aborted) return Promise.resolve("cancelled");
  return new Promise((resolve, reject) => {
    const onAbort = () => resolve("cancelled");
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}
