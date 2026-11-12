import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones. One row (id 1) holds
// the whole log, because usage is a single global list replaced as a whole.
export const USAGE_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE usage_log (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
];

const migrated = new WeakSet<DatabaseSync>();

// Runs the usage migrations once per database handle.
export function ensureUsageSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "usage", USAGE_MIGRATIONS);
  migrated.add(db);
}
