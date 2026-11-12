/** What the bot is doing while its turn is in flight. */
export type ActivityPhase = "thinking" | "writing" | "consulting" | "tool";

interface ActivityPhaseInput {
  /** A crew member is working for the bot that took the message. */
  delegating: boolean;
  /** Reply text has started to arrive. */
  hasStreamedText: boolean;
  /** A tool call of the turn is running now. */
  usingTool?: boolean;
}

/**
 * The phase to show now: a delegation outranks a running tool, which
 * outranks text already on screen.
 */
export function activityPhase({
  delegating,
  hasStreamedText,
  usingTool = false,
}: ActivityPhaseInput): ActivityPhase {
  if (delegating) return "consulting";
  if (usingTool) return "tool";
  return hasStreamedText ? "writing" : "thinking";
}

/** Whole seconds since the turn began; never negative. */
export function elapsedSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}
