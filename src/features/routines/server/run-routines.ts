import type { DatabaseSync } from "node:sqlite";
import { isNothingNew } from "../silent-run.ts";
import {
  claimDueRoutines,
  finishRun,
  startRun,
  type RunEnd,
  type RunOrigin,
} from "./routine-runs-repository.ts";
import type { StoredRoutine } from "./routines-repository.ts";

/** What running a routine produced: the model's reply, or why it failed. */
export type RoutineRunResult =
  { kind: "replied"; text: string } | { kind: "failed"; reason: string };

/** Runs one routine's prompt; the scheduler does not know how. */
export type RoutineRunner = (
  routine: StoredRoutine,
) => Promise<RoutineRunResult>;

function toEnd(
  result: RoutineRunResult,
  routine: StoredRoutine,
  origin: RunOrigin,
): RunEnd {
  if (result.kind === "failed")
    return { status: "failed", reason: result.reason };
  // A manual run is never silent: the user asked to see the answer.
  const nothingNew =
    origin === "schedule" &&
    routine.silentWhenNothingNew &&
    isNothingNew(result.text);
  return { status: "succeeded", nothingNew, output: result.text };
}

/**
 * Runs a routine already marked running and records the outcome. A runner
 * that throws becomes a failed run, never a stuck one.
 */
export async function runClaimedRoutine(
  db: DatabaseSync,
  routine: StoredRoutine,
  origin: RunOrigin,
  runner: RoutineRunner,
  clock: () => number,
): Promise<RunEnd> {
  const runId = startRun(db, routine.id, origin, clock());
  let result: RoutineRunResult;
  try {
    result = await runner(routine);
  } catch {
    result = { kind: "failed", reason: "unexpected_error" };
  }
  const end = toEnd(result, routine, origin);
  finishRun(db, runId, routine.id, end, clock());
  return end;
}

/** One scheduler tick: claims every due routine and runs them one by one. */
export async function runDueRoutines(
  db: DatabaseSync,
  runner: RoutineRunner,
  clock: () => number = Date.now,
): Promise<number> {
  const due = claimDueRoutines(db, clock());
  for (const routine of due) {
    await runClaimedRoutine(db, routine, "schedule", runner, clock);
  }
  return due.length;
}
