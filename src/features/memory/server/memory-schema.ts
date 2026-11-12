import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones.
export const MEMORY_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE bot_memory (bot_id TEXT PRIMARY KEY, data TEXT NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
];

const migrated = new WeakSet<DatabaseSync>();

// Runs the memory migrations once per database handle.
export function ensureMemorySchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "memory", MEMORY_MIGRATIONS);
  migrated.add(db);
}
