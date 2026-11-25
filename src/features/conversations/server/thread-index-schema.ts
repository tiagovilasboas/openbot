import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones.
export const THREAD_INDEX_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE thread_index (bot_id TEXT NOT NULL, thread_id TEXT NOT NULL, title TEXT, pinned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, position INTEGER NOT NULL, PRIMARY KEY (bot_id, thread_id))",
];

const migrated = new WeakSet<DatabaseSync>();

// Runs the thread index migrations once per database handle.
export function ensureThreadIndexSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "thread_index", THREAD_INDEX_MIGRATIONS);
  migrated.add(db);
}
