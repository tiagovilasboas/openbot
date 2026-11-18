import {
  parseTime,
  type RoutineSchedule,
  type Weekday,
} from "./routine-schedule.ts";
import { addDays, instantAt, wallClockAt } from "./zoned-time.ts";

const MINUTE = 60_000;

/**
 * The first instant strictly after `from` when the schedule fires. An
 * interval counts from `from` (the last run, or the moment it was enabled).
 */
export function nextRunAt(schedule: RoutineSchedule, from: Date): Date {
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
