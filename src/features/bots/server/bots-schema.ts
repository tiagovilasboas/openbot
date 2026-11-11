import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones.
export const BOTS_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE bots (id TEXT PRIMARY KEY, position INTEGER NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE bot_selection (key TEXT PRIMARY KEY, bot_id TEXT)",
];

const migrated = new WeakSet<DatabaseSync>();

// Runs the bots migrations once per database handle.
export function ensureBotsSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "bots", BOTS_MIGRATIONS);
  migrated.add(db);
}
