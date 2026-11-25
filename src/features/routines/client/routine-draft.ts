import type { RoutineInput } from "../routine-input.ts";
import {
  checkSchedule,
  type RoutineSchedule,
  type ScheduleProblem,
  type Weekday,
} from "../routine-schedule.ts";

export type ScheduleKind = RoutineSchedule["kind"];

/** What the routine form edits: flat strings, checked only on save. */
export type RoutineDraft = {
  id: string;
  title: string;
  prompt: string;
  kind: ScheduleKind;
  everyMinutes: string;
  time: string;
  days: Weekday[];
  timeZone: string;
  enabled: boolean;
  silentWhenNothingNew: boolean;
  runInThread: boolean;
  /** The routine this one runs after; empty for none. */
  afterRoutineId: string;
  /** Runs carry the bot's active goal as context. */
  goalLinked: boolean;
  /** A one-time run's moment (epoch ms); set only by a bot's wake-up. */
  onceAt: number | null;
};

export type DraftProblem =
  "invalid_title" | "invalid_prompt" | ScheduleProblem | "unknown_kind";

export type DraftCheck =
  { ok: true; input: RoutineInput } | { ok: false; problem: DraftProblem };

const WEEKDAYS_MON_FIRST: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Weekdays in the order the form shows them (Monday first). */
export const FORM_WEEKDAYS = WEEKDAYS_MON_FIRST;

/** The browser's IANA time zone, or UTC when it cannot tell. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** A short random id that passes the server's id check. */
export function newRoutineId(random: () => number = Math.random): string {
  const part = () => Math.floor(random() * 36 ** 6).toString(36);
  return `r_${part()}${part()}`;
}

/** A fresh draft: weekdays at 08:00 in the browser's time zone. */
export function emptyDraft(
  timeZone: string = localTimeZone(),
  id: string = newRoutineId(),
): RoutineDraft {
  return {
    id,
    title: "",
    prompt: "",
    kind: "daily",
    everyMinutes: "60",
    time: "08:00",
    days: [1, 2, 3, 4, 5],
    timeZone,
    enabled: true,
    silentWhenNothingNew: true,
    runInThread: false,
    afterRoutineId: "",
    goalLinked: false,
    onceAt: null,
  };
}

/** The draft of a saved routine, for editing. */
export function draftFromRoutine(
  routine: RoutineInput,
  timeZone: string = localTimeZone(),
): RoutineDraft {
  const base = { ...emptyDraft(timeZone, routine.id) };
  const schedule = routine.schedule;
  return {
    ...base,
    title: routine.title,
    prompt: routine.prompt,
    enabled: routine.enabled,
    silentWhenNothingNew: routine.silentWhenNothingNew,
    runInThread: routine.runInThread,
    afterRoutineId: routine.afterRoutineId ?? "",
    goalLinked: routine.goalLinked === true,
    kind: schedule.kind,
    ...(schedule.kind === "interval"
      ? { everyMinutes: String(schedule.everyMinutes) }
      : schedule.kind === "once"
        ? { onceAt: schedule.at }
        : { time: schedule.time, timeZone: schedule.timeZone }),
    ...(schedule.kind === "weekly" ? { days: [...schedule.days] } : {}),
  };
}

function scheduleOf(draft: RoutineDraft): unknown {
  if (draft.kind === "once") return { kind: "once", at: draft.onceAt };
  if (draft.kind === "interval") {
    return { kind: "interval", everyMinutes: Number(draft.everyMinutes) };
  }
  if (draft.kind === "daily") {
    return { kind: "daily", time: draft.time, timeZone: draft.timeZone };
  }
  return {
    kind: "weekly",
    days: [...draft.days].sort(),
    time: draft.time,
    timeZone: draft.timeZone,
  };
}

/** Turns a draft into the server's input, or names the first problem. */
export function checkDraft(draft: RoutineDraft, botId: string): DraftCheck {
  const title = draft.title.trim();
  if (!title) return { ok: false, problem: "invalid_title" };
  const prompt = draft.prompt.trim();
  if (!prompt) return { ok: false, problem: "invalid_prompt" };
  const schedule = checkSchedule(scheduleOf(draft));
  if (!schedule.ok) return { ok: false, problem: schedule.problem };
  return {
    ok: true,
    input: {
      id: draft.id,
      botId,
      title,
      prompt,
      schedule: schedule.schedule,
      enabled: draft.enabled,
      silentWhenNothingNew: draft.silentWhenNothingNew,
      runInThread: draft.runInThread,
      ...(draft.afterRoutineId ? { afterRoutineId: draft.afterRoutineId } : {}),
      ...(draft.goalLinked ? { goalLinked: true } : {}),
    },
  };
}

/** Adds or removes one weekday, keeping the form order. */
export function toggleDay(days: readonly Weekday[], day: Weekday): Weekday[] {
  const next = days.includes(day)
    ? days.filter((d) => d !== day)
    : [...days, day];
  return WEEKDAYS_MON_FIRST.filter((d) => next.includes(d));
}
