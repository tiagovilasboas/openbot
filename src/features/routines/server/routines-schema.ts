import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones.
export const ROUTINES_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE routines (id TEXT PRIMARY KEY, bot_id TEXT NOT NULL, enabled INTEGER NOT NULL, running_since INTEGER, next_run_at INTEGER, last_run_at INTEGER, data TEXT NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE INDEX routines_due ON routines (enabled, next_run_at)",
  "CREATE TABLE routine_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, routine_id TEXT NOT NULL, origin TEXT NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER, status TEXT NOT NULL, reason TEXT, nothing_new INTEGER, output TEXT)",
  "CREATE INDEX routine_runs_by_routine ON routine_runs (routine_id, started_at)",
  // Set when the scheduler paused the routine for inactivity; a save clears it.
  "ALTER TABLE routines ADD COLUMN idle_paused_at INTEGER",
  // Existing routines get a fresh idle clock at upgrade, so none pauses on
  // the first tick for time spent before the feature existed.
  "ALTER TABLE routines ADD COLUMN idle_baseline_at INTEGER",
  "UPDATE routines SET idle_baseline_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000",
  // 1 while the routine's runs carry the bot's goal as context.
  "ALTER TABLE routines ADD COLUMN goal_linked INTEGER NOT NULL DEFAULT 0",
];

const migrated = new WeakSet<DatabaseSync>();

// Runs the routines migrations once per database handle.
export function ensureRoutinesSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "routines", ROUTINES_MIGRATIONS);
  migrated.add(db);
}
