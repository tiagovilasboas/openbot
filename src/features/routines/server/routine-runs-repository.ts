import type { DatabaseSync } from "node:sqlite";
import { nextRunAt } from "../next-run.ts";
import { getRoutine, type StoredRoutine } from "./routines-repository.ts";
import { ensureRoutinesSchema } from "./routines-schema.ts";

export type RunOrigin = "schedule" | "manual" | "chain";

export type RoutineRunRecord = {
  id: number;
  routineId: string;
  origin: RunOrigin;
  startedAt: number;
  finishedAt: number | null;
  status: "running" | "succeeded" | "failed";
  reason: string | null;
  nothingNew: boolean | null;
  /** The reply, capped; null for a failed or silent run. */
  output: string | null;
};

/** A run left "running" longer than this is treated as lost (crash, restart). */
export const STALE_RUN_MS = 30 * 60_000;
const MAX_REASON = 500;
const HISTORY_KEPT = 50;
export const MAX_OUTPUT = 8_000;

/**
 * Marks every enabled, idle routine whose next run has passed as running, in
 * one transaction, and returns them. A routine claimed here is never claimed
 * again until its run finishes, so two ticks cannot run it twice.
 */
export function claimDueRoutines(
  db: DatabaseSync,
  now: number,
): StoredRoutine[] {
  ensureRoutinesSchema(db);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE routines SET running_since = NULL WHERE running_since IS NOT NULL AND running_since < ?",
    ).run(now - STALE_RUN_MS);
    const ids = (
      db
        .prepare(
          "SELECT id FROM routines WHERE enabled = 1 AND running_since IS NULL AND next_run_at IS NOT NULL AND next_run_at <= ? ORDER BY next_run_at",
        )
        .all(now) as { id: string }[]
    ).map((row) => row.id);
    const mark = db.prepare(
      "UPDATE routines SET running_since = ? WHERE id = ?",
    );
    for (const id of ids) mark.run(now, id);
    db.exec("COMMIT");
    return ids
      .map((id) => getRoutine(db, id))
      .filter((r): r is StoredRoutine => r !== null);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/**
 * Marks one routine as running for a manual run, even when disabled or not
 * due. Null when it does not exist or a run is already in flight.
 */
export function claimRoutine(
  db: DatabaseSync,
  id: string,
  now: number,
): StoredRoutine | null {
  ensureRoutinesSchema(db);
  const claimed = db
    .prepare(
      "UPDATE routines SET running_since = ? WHERE id = ? AND (running_since IS NULL OR running_since < ?)",
    )
    .run(now, id, now - STALE_RUN_MS);
  return claimed.changes > 0 ? getRoutine(db, id) : null;
}

/** Opens a run record for a routine already marked running. */
export function startRun(
  db: DatabaseSync,
  routineId: string,
  origin: RunOrigin,
  now: number,
): number {
  ensureRoutinesSchema(db);
  const result = db
    .prepare(
      "INSERT INTO routine_runs (routine_id, origin, started_at, status) VALUES (?, ?, ?, 'running')",
    )
    .run(routineId, origin, now);
  return Number(result.lastInsertRowid);
}

export type RunEnd =
  | { status: "succeeded"; nothingNew: boolean; output: string }
  | { status: "failed"; reason: string };

/**
 * Closes a run, clears the running flag and schedules the next run from the
 * finish time. Keeps the last runs of each routine and drops older ones.
 */
export function finishRun(
  db: DatabaseSync,
  runId: number,
  routineId: string,
  end: RunEnd,
  now: number,
): void {
  ensureRoutinesSchema(db);
  const reason =
    end.status === "failed" ? end.reason.slice(0, MAX_REASON) : null;
  const nothingNew =
    end.status === "succeeded" ? (end.nothingNew ? 1 : 0) : null;
  const output =
    end.status === "succeeded" && !end.nothingNew
      ? end.output.slice(0, MAX_OUTPUT)
      : null;
  db.prepare(
    "UPDATE routine_runs SET finished_at = ?, status = ?, reason = ?, nothing_new = ?, output = ? WHERE id = ?",
  ).run(now, end.status, reason, nothingNew, output, runId);
  const routine = getRoutine(db, routineId);
  const next = routine?.enabled
    ? nextRunAt(routine.schedule, new Date(now)).getTime()
    : null;
  db.prepare(
    "UPDATE routines SET running_since = NULL, last_run_at = ?, next_run_at = ? WHERE id = ?",
  ).run(now, next, routineId);
  db.prepare(
    "DELETE FROM routine_runs WHERE routine_id = ? AND id NOT IN (SELECT id FROM routine_runs WHERE routine_id = ? ORDER BY id DESC LIMIT ?)",
  ).run(routineId, routineId, HISTORY_KEPT);
}

type RunRow = {
  id: number;
  routine_id: string;
  origin: RunOrigin;
  started_at: number;
  finished_at: number | null;
  status: RoutineRunRecord["status"];
  reason: string | null;
  nothing_new: number | null;
  output: string | null;
};

/** The latest runs of a routine, newest first. */
export function listRuns(
  db: DatabaseSync,
  routineId: string,
  limit = 20,
): RoutineRunRecord[] {
  ensureRoutinesSchema(db);
  const found = db
    .prepare(
      "SELECT * FROM routine_runs WHERE routine_id = ? ORDER BY id DESC LIMIT ?",
    )
    .all(routineId, limit) as RunRow[];
  return found.map((row) => ({
    id: row.id,
    routineId: row.routine_id,
    origin: row.origin,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    reason: row.reason,
    nothingNew: row.nothing_new === null ? null : row.nothing_new === 1,
    output: row.output,
  }));
}
