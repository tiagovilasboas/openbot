/** What the bot is doing while its turn is in flight. */
export type ActivityPhase = "thinking" | "writing" | "consulting";

interface ActivityPhaseInput {
  /** A crew member is working for the bot that took the message. */
  delegating: boolean;
  /** Reply text has started to arrive. */
  hasStreamedText: boolean;
}

/** The phase to show now; a delegation outranks text already on screen. */
export function activityPhase({
  delegating,
  hasStreamedText,
}: ActivityPhaseInput): ActivityPhase {
  if (delegating) return "consulting";
  return hasStreamedText ? "writing" : "thinking";
}

/** Whole seconds since the turn began; never negative. */
export function elapsedSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}
