import type { FailoverInfo } from "./model-adapter.ts";

/** Longest wait a provider may announce and still be shown: one week. */
export const MAX_RESET_SECONDS = 7 * 24 * 60 * 60;

/** Headers that may carry the reset of a usage limit, most specific first. */
const RESET_HEADERS = [
  "retry-after",
  "anthropic-ratelimit-requests-reset",
  "anthropic-ratelimit-tokens-reset",
  "x-ratelimit-reset",
  "ratelimit-reset",
] as const;

const RESET_TAG = /\s+reset=(\d{1,7})$/;

/** Seconds until the instant a header value names, or undefined. */
function secondsFromValue(raw: string, nowMs: number): number | undefined {
  const value = raw.trim();
  let seconds: number;
  if (/^\d+(\.\d+)?$/.test(value)) {
    const n = Number(value);
    // A big number is an epoch (ms or s); a small one is a delay in seconds.
    if (n > 1e12) seconds = (n - nowMs) / 1000;
    else if (n > 1e9) seconds = n - nowMs / 1000;
    else seconds = n;
  } else {
    const at = Date.parse(value);
    if (Number.isNaN(at)) return undefined;
    seconds = (at - nowMs) / 1000;
  }
  const whole = Math.ceil(seconds);
  return whole >= 1 && whole <= MAX_RESET_SECONDS ? whole : undefined;
}

/** How long until the limit resets, from the response headers, if stated. */
export function resetSecondsFromHeaders(
  headers: Pick<Headers, "get"> | undefined,
  nowMs: number = Date.now(),
): number | undefined {
  if (!headers) return undefined;
  for (const name of RESET_HEADERS) {
    const raw = headers.get(name);
    const seconds = raw ? secondsFromValue(raw, nowMs) : undefined;
    if (seconds !== undefined) return seconds;
  }
  return undefined;
}

/** A fixed-vocabulary error detail with the reset time appended. */
export function withResetTag(detail: string, seconds?: number): string {
  return seconds === undefined ? detail : `${detail} reset=${seconds}`;
}

export function resetSecondsOfDetail(
  detail: string | undefined,
): number | undefined {
  const match = detail?.match(RESET_TAG);
  return match ? Number(match[1]) : undefined;
}

export function stripResetTag(detail: string): string {
  return detail.replace(RESET_TAG, "");
}

/** The failover note: `reason` never carries the reset tag, `resetSeconds` does. */
export function failoverInfoFor(
  fromModel: string,
  toModel: string,
  detail: string,
): FailoverInfo {
  const resetSeconds = resetSecondsOfDetail(detail);
  return {
    fromModel,
    toModel,
    reason: stripResetTag(detail),
    ...(resetSeconds !== undefined ? { resetSeconds } : {}),
  };
}
