const BLINK_PERIOD_S = 5.5;

/** Deterministic negative delay (seconds) that staggers blinks per avatar. */
export function blinkDelay(seed: string): number {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return -((hash % 1000) / 1000) * BLINK_PERIOD_S;
}
