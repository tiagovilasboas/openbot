/**
 * When a routine runs. Kept small and explicit: a fixed interval, a daily
 * time, or chosen weekdays at a time, always in a named IANA time zone.
 */

export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 7 * 24 * 60;

/** 0 = Sunday … 6 = Saturday, as in `Date.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Furthest a one-time run may be set: the same week as the longest interval. */
export const MAX_ONCE_AHEAD_MS = MAX_INTERVAL_MINUTES * 60_000;

export type RoutineSchedule =
  | { kind: "interval"; everyMinutes: number }
  /** Runs once at `at` (epoch ms), then stays off: a bot's wake-up. */
  | { kind: "once"; at: number }
  | { kind: "daily"; time: string; timeZone: string }
  | {
      kind: "weekly";
      days: readonly Weekday[];
      time: string;
      timeZone: string;
    };

export type ScheduleProblem =
  | "unknown_kind"
  | "interval_too_short"
  | "interval_too_long"
  | "bad_time"
  | "bad_time_zone"
  | "no_days"
  | "bad_once_time";

export type ScheduleCheck =
  | { ok: true; schedule: RoutineSchedule }
  | { ok: false; problem: ScheduleProblem };

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Hours and minutes of an "HH:MM" string, or null when it is not one. */
export function parseTime(
  value: unknown,
): { hour: number; minute: number } | null {
  if (typeof value !== "string") return null;
  const match = TIME.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function checkDays(value: unknown): Weekday[] | null {
  if (!Array.isArray(value)) return null;
  const days = new Set<Weekday>();
  for (const day of value) {
    if (!Number.isInteger(day) || day < 0 || day > 6) return null;
    days.add(day as Weekday);
  }
  return [...days].sort((a, b) => a - b);
}

/** Validates untrusted input (a form, a stored row, a tool call). Never throws. */
export function checkSchedule(input: unknown): ScheduleCheck {
  if (typeof input !== "object" || input === null) {
    return { ok: false, problem: "unknown_kind" };
  }
  const raw = input as Record<string, unknown>;
  if (raw.kind === "interval") {
    const minutes = raw.everyMinutes;
    if (typeof minutes !== "number" || !Number.isInteger(minutes)) {
      return { ok: false, problem: "interval_too_short" };
    }
    if (minutes < MIN_INTERVAL_MINUTES) {
      return { ok: false, problem: "interval_too_short" };
    }
    if (minutes > MAX_INTERVAL_MINUTES) {
      return { ok: false, problem: "interval_too_long" };
    }
    return { ok: true, schedule: { kind: "interval", everyMinutes: minutes } };
  }
  if (raw.kind === "once") {
    const at = raw.at;
    if (typeof at !== "number" || !Number.isSafeInteger(at) || at <= 0) {
      return { ok: false, problem: "bad_once_time" };
    }
    return { ok: true, schedule: { kind: "once", at } };
  }
  if (raw.kind !== "daily" && raw.kind !== "weekly") {
    return { ok: false, problem: "unknown_kind" };
  }
  if (!parseTime(raw.time)) return { ok: false, problem: "bad_time" };
  if (!isTimeZone(raw.timeZone)) return { ok: false, problem: "bad_time_zone" };
  const time = raw.time as string;
  const timeZone = raw.timeZone as string;
  if (raw.kind === "daily") {
    return { ok: true, schedule: { kind: "daily", time, timeZone } };
  }
  const days = checkDays(raw.days);
  if (!days || days.length === 0) return { ok: false, problem: "no_days" };
  return { ok: true, schedule: { kind: "weekly", days, time, timeZone } };
}
