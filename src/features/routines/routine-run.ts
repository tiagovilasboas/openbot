import type { RoutineSchedule } from "./routine-schedule.ts";

/** A routine: a prompt a bot runs on a schedule, without the user present. */
export type Routine = {
  id: string;
  botId: string;
  title: string;
  prompt: string;
  schedule: RoutineSchedule;
  enabled: boolean;
  /** When true, a run that finds nothing new leaves no message behind. */
  silentWhenNothingNew: boolean;
  run: RoutineRunState;
  lastRunAt?: string;
  nextRunAt?: string;
};

export type RoutineRunState =
  | { status: "idle" }
  | { status: "running"; startedAt: string }
  | { status: "succeeded"; finishedAt: string; nothingNew: boolean }
  | { status: "failed"; finishedAt: string; reason: string }
  | { status: "skipped"; at: string; reason: "disabled" | "already_running" };

export type RoutineRunEvent =
  | { type: "start"; at: string }
  | { type: "finish"; at: string; nothingNew: boolean }
  | { type: "fail"; at: string; reason: string };

/**
 * The run state after an event. A start while a run is in flight, or on a
 * disabled routine, is skipped instead of starting a second run; a finish or
 * failure without a run in flight changes nothing.
 */
export function nextRunState(
  routine: Pick<Routine, "enabled" | "run">,
  event: RoutineRunEvent,
): RoutineRunState {
  const current = routine.run;
  if (event.type === "start") {
    if (!routine.enabled)
      return { status: "skipped", at: event.at, reason: "disabled" };
    if (current.status === "running") {
      return { status: "skipped", at: event.at, reason: "already_running" };
    }
    return { status: "running", startedAt: event.at };
  }
  if (current.status !== "running") return current;
  if (event.type === "finish") {
    return {
      status: "succeeded",
      finishedAt: event.at,
      nothingNew: event.nothingNew,
    };
  }
  return { status: "failed", finishedAt: event.at, reason: event.reason };
}

/** Whether a routine is due at `now`: enabled, idle and past its next run. */
export function isDue(
  routine: Pick<Routine, "enabled" | "run" | "nextRunAt">,
  now: Date,
): boolean {
  if (!routine.enabled || routine.run.status === "running") return false;
  if (!routine.nextRunAt) return false;
  return Date.parse(routine.nextRunAt) <= now.getTime();
}
