import {
  parseTime,
  type RoutineSchedule,
  type Weekday,
} from "./routine-schedule.ts";
import { addDays, instantAt, wallClockAt } from "./zoned-time.ts";

const MINUTE = 60_000;

/**
 * The first instant strictly after `from` when the schedule fires, or null
 * when it never will again (a one-time run already past). An interval counts
 * from `from` (the last run, or the moment it was enabled).
 */
export function nextRunAt(
  schedule: Exclude<RoutineSchedule, { kind: "once" }>,
  from: Date,
): Date;
export function nextRunAt(schedule: RoutineSchedule, from: Date): Date | null;
export function nextRunAt(schedule: RoutineSchedule, from: Date): Date | null {
  if (schedule.kind === "once") {
    return schedule.at > from.getTime() ? new Date(schedule.at) : null;
  }
  if (schedule.kind === "interval") {
    return new Date(from.getTime() + schedule.everyMinutes * MINUTE);
  }
  const time = parseTime(schedule.time);
  if (!time) throw new Error("nextRunAt needs a checked schedule");
  const today = wallClockAt(from, schedule.timeZone);
  // Eight days covers every weekly pattern, including "today, but later".
  for (let offset = 0; offset <= 8; offset += 1) {
    const date = addDays(today, offset);
    const weekday = (today.weekday + offset) % 7;
    if (
      schedule.kind === "weekly" &&
      !schedule.days.includes(weekday as Weekday)
    ) {
      continue;
    }
    const candidate = instantAt(date, time, schedule.timeZone);
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  throw new Error("nextRunAt found no run in the next eight days");
}
