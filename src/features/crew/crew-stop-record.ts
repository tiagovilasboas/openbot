import { DEFAULT_LOOP_GUARD_OPTIONS } from "./loop-guard/index.ts";
import type { LoopStopReason } from "./loop-guard/index.ts";

const REASONS = ["max_rounds", "echo", "ping_pong"] as const;

/** What is kept on a turn's final reply about why the loop guard stopped it. */
export interface CrewStopRecord {
  reason: (typeof REASONS)[number];
  /** The round cap that was hit; only for `max_rounds`. */
  limit?: number;
}

export function toCrewStopRecord(stop: LoopStopReason): CrewStopRecord {
  return stop.reason === "max_rounds"
    ? { reason: "max_rounds", limit: stop.limit }
    : { reason: stop.reason };
}

/** Reads an untrusted stop record; undefined when it is not a known reason. */
export function sanitizeCrewStop(raw: unknown): CrewStopRecord | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const { reason, limit } = raw as Record<string, unknown>;
  const known = REASONS.find((r) => r === reason);
  if (!known) return undefined;
  if (known !== "max_rounds") return { reason: known };
  const valid = typeof limit === "number" && Number.isInteger(limit);
  return {
    reason: known,
    limit:
      valid && limit > 0 && limit <= 1000
        ? limit
        : DEFAULT_LOOP_GUARD_OPTIONS.maxRounds,
  };
}
