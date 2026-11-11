import {
  readIncompleteKind,
  type IncompleteKind,
} from "../chat/incomplete-reply.ts";

/** What is kept on a specialist's stored reply about its part in a turn. */
export interface CrewStepRecord {
  /** The task the Chief handed over. */
  task: string;
  /** False when the specialist could not answer. */
  ok: boolean;
  /** Milliseconds the specialist took; absent on replies from older versions. */
  durationMs?: number;
  /**
   * Set when the specialist's stream broke midway: the stored text is what
   * arrived (ok stays true). Absent on complete answers and on failures.
   */
  incomplete?: IncompleteKind;
}

const MAX_TASK_LENGTH = 4_000;
/** A step that took longer than a day is not a real measurement. */
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

/** A usable duration (whole milliseconds), or undefined for anything else. */
export function sanitizeDurationMs(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 0 || value > MAX_DURATION_MS) return undefined;
  return Math.round(value);
}

/** Reads an untrusted crew step; null when the task or the status is unusable. */
export function sanitizeCrewStep(raw: unknown): CrewStepRecord | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const { task, ok, durationMs, incomplete } = raw as Record<string, unknown>;
  if (typeof task !== "string" || typeof ok !== "boolean") return null;
  const duration = sanitizeDurationMs(durationMs);
  const kind = ok ? readIncompleteKind(incomplete) : undefined;
  return {
    task: task.slice(0, MAX_TASK_LENGTH),
    ok,
    ...(duration === undefined ? {} : { durationMs: duration }),
    ...(kind ? { incomplete: kind } : {}),
  };
}
