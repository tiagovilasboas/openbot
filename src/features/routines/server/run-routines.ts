import type { DatabaseSync } from "node:sqlite";
import { isNothingNew } from "../silent-run.ts";
import { followersOf, MAX_CHAIN_DEPTH } from "../routine-chain.ts";
import {
  claimDueRoutines,
  claimRoutine,
  finishRun,
  startRun,
  type RunEnd,
  type RunOrigin,
} from "./routine-runs-repository.ts";
import { listRoutines, type StoredRoutine } from "./routines-repository.ts";

/** What running a routine produced: the model's reply, or why it failed. */
export type RoutineRunResult =
  { kind: "replied"; text: string } | { kind: "failed"; reason: string };

/**
 * Runs one routine's prompt; the scheduler does not know how. A chained run
 * also gets the previous routine's result, which is untrusted text.
 */
export type RoutineRunner = (
  routine: StoredRoutine,
  previousOutput?: string,
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
    origin !== "manual" &&
    routine.silentWhenNothingNew &&
    isNothingNew(result.text);
  return { status: "succeeded", nothingNew, output: result.text };
}

/**
 * Runs a routine already marked running and records the outcome. A runner
 * that throws becomes a failed run, never a stuck one. A run that reports
 * something starts the routines chained after it, up to MAX_CHAIN_DEPTH.
 */
export async function runClaimedRoutine(
  db: DatabaseSync,
  routine: StoredRoutine,
  origin: RunOrigin,
  runner: RoutineRunner,
  clock: () => number,
  chain: { previousOutput?: string; visited?: Set<string> } = {},
): Promise<RunEnd> {
  const runId = startRun(db, routine.id, origin, clock());
  let result: RoutineRunResult;
  try {
    result = await runner(routine, chain.previousOutput);
  } catch {
    result = { kind: "failed", reason: "unexpected_error" };
  }
  const end = toEnd(result, routine, origin);
  finishRun(db, runId, routine.id, end, clock());
  const visited = chain.visited ?? new Set<string>();
  visited.add(routine.id);
  if (end.status === "succeeded" && !end.nothingNew) {
    await runFollowers(db, routine, end.output, runner, clock, visited);
  }
  return end;
}

/** Starts each enabled follower once; a loop or a long chain stops here. */
async function runFollowers(
  db: DatabaseSync,
  finished: StoredRoutine,
  output: string,
  runner: RoutineRunner,
  clock: () => number,
  visited: Set<string>,
): Promise<void> {
  if (visited.size >= MAX_CHAIN_DEPTH) return;
  for (const follower of followersOf(finished, listRoutines(db))) {
    if (visited.has(follower.id)) continue;
    const claimed = claimRoutine(db, follower.id, clock());
    if (!claimed) continue;
    await runClaimedRoutine(db, claimed, "chain", runner, clock, {
      previousOutput: output,
      visited,
    });
  }
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
