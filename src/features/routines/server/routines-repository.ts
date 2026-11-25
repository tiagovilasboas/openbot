import type { DatabaseSync } from "node:sqlite";
import { nextRunAt } from "../next-run.ts";
import { isOneShotRoutineId } from "../routine-idle.ts";
import {
  checkRoutineInput,
  MAX_ROUTINES_PER_BOT,
  type RoutineInput,
} from "../routine-input.ts";
import { ensureRoutinesSchema } from "./routines-schema.ts";

/** A stored routine with the scheduler's view of it. Times are epoch ms. */
export type StoredRoutine = RoutineInput & {
  runningSince: number | null;
  nextRunAt: number | null;
  lastRunAt: number | null;
  /** Its last activity: the last save (create, edit, resume) or the upgrade baseline. */
  updatedAt: number;
  /** When the scheduler paused it for inactivity; null when it did not. */
  idlePausedAt: number | null;
};

type Row = {
  data: string;
  running_since: number | null;
  next_run_at: number | null;
  last_run_at: number | null;
  idle_paused_at: number | null;
  goal_linked: number;
  active_at: number;
};

const COLUMNS =
  "data, running_since, next_run_at, last_run_at, idle_paused_at, goal_linked, MAX(updated_at, COALESCE(idle_baseline_at, 0)) AS active_at";

// A damaged row is skipped, never trusted and never fatal.
function fromRow(row: Row): StoredRoutine | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.data);
  } catch {
    return null;
  }
  const checked = checkRoutineInput(parsed);
  if (!checked.ok) return null;
  // The column is the one source of the link; the stored data may be stale.
  const routine = { ...checked.routine };
  delete routine.goalLinked;
  return {
    ...routine,
    ...(row.goal_linked === 1 && !isOneShotRoutineId(routine.id)
      ? { goalLinked: true }
      : {}),
    runningSince: row.running_since,
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    updatedAt: row.active_at,
    idlePausedAt: row.idle_paused_at,
  };
}

function rows(db: DatabaseSync, sql: string, ...params: (string | number)[]) {
  const found = db.prepare(sql).all(...params) as Row[];
  return found.map(fromRow).filter((r): r is StoredRoutine => r !== null);
}

export function listRoutines(
  db: DatabaseSync,
  botId?: string,
): StoredRoutine[] {
  ensureRoutinesSchema(db);
  return botId
    ? rows(
        db,
        `SELECT ${COLUMNS} FROM routines WHERE bot_id = ? ORDER BY updated_at`,
        botId,
      )
    : rows(db, `SELECT ${COLUMNS} FROM routines ORDER BY updated_at`);
}

export function getRoutine(db: DatabaseSync, id: string): StoredRoutine | null {
  ensureRoutinesSchema(db);
  return (
    rows(db, `SELECT ${COLUMNS} FROM routines WHERE id = ?`, id)[0] ?? null
  );
}

export type SaveResult =
  | { ok: true; routine: StoredRoutine }
  | { ok: false; error: "too_many_routines" };

/**
 * Creates or replaces a routine. Every write recomputes the next run from
 * `now`, so a changed schedule never fires on the old one; a run in flight
 * keeps its flag.
 */
export function saveRoutine(
  db: DatabaseSync,
  routine: RoutineInput,
  now: number,
): SaveResult {
  ensureRoutinesSchema(db);
  const existing = getRoutine(db, routine.id);
  if (!existing) {
    const { count } = db
      .prepare("SELECT COUNT(*) AS count FROM routines WHERE bot_id = ?")
      .get(routine.botId) as { count: number };
    if (count >= MAX_ROUTINES_PER_BOT)
      return { ok: false, error: "too_many_routines" };
  }
  const next = routine.enabled
    ? (nextRunAt(routine.schedule, new Date(now))?.getTime() ?? null)
    : null;
  const { goalLinked, ...stored } = routine;
  db.prepare(
    `INSERT INTO routines (id, bot_id, enabled, running_since, next_run_at, last_run_at, data, updated_at, goal_linked)
     VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET bot_id = excluded.bot_id, enabled = excluded.enabled,
       next_run_at = excluded.next_run_at, data = excluded.data, updated_at = excluded.updated_at,
       goal_linked = excluded.goal_linked, idle_paused_at = NULL`,
  ).run(
    routine.id,
    routine.botId,
    routine.enabled ? 1 : 0,
    next,
    JSON.stringify(stored),
    now,
    goalLinked ? 1 : 0,
  );
  return { ok: true, routine: getRoutine(db, routine.id)! };
}

/** Removes a routine and its run history. False when there was none. */
export function deleteRoutine(db: DatabaseSync, id: string): boolean {
  ensureRoutinesSchema(db);
  db.prepare("DELETE FROM routine_runs WHERE routine_id = ?").run(id);
  return db.prepare("DELETE FROM routines WHERE id = ?").run(id).changes > 0;
}

/** Removes every routine of bots that no longer exist. */
export function forgetBotRoutines(
  db: DatabaseSync,
  botIds: readonly string[],
): void {
  for (const routine of listRoutines(db)) {
    if (botIds.includes(routine.botId)) deleteRoutine(db, routine.id);
  }
}
