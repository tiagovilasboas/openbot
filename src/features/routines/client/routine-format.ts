import { HTML_LANG, type Language } from "../../language/language.ts";
import type { RoutineSchedule, Weekday } from "../routine-schedule.ts";
import { FORM_WEEKDAYS } from "./routine-draft.ts";
import type { RoutinesCopy } from "./routines-copy.ts";

// 2024-01-07 was a Sunday, so day d of the week is 7 + d.
const weekdayDate = (day: Weekday) => new Date(Date.UTC(2024, 0, 7 + day));

/** A short weekday name ("seg", "Mon") in the interface language. */
export function weekdayName(day: Weekday, language: Language): string {
  return new Intl.DateTimeFormat(HTML_LANG[language], {
    weekday: "short",
    timeZone: "UTC",
  }).format(weekdayDate(day));
}

/** One line that says when a routine runs. */
export function scheduleSummary(
  schedule: RoutineSchedule,
  copy: RoutinesCopy,
  language: Language,
): string {
  if (schedule.kind === "interval") return copy.every(schedule.everyMinutes);
  if (schedule.kind === "daily") return copy.dailyAt(schedule.time);
  const days = FORM_WEEKDAYS.filter((d) => schedule.days.includes(d))
    .map((d) => weekdayName(d, language))
    .join(", ");
  return copy.weeklyAt(days, schedule.time);
}

/** A date and time in the interface language and the viewer's zone. */
export function formatWhen(
  epochMs: number,
  language: Language,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(HTML_LANG[language], {
    dateStyle: "short",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(epochMs));
}
