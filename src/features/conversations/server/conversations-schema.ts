import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones.
export const CONVERSATIONS_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE conversations (bot_id TEXT PRIMARY KEY, data TEXT NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
];

const migrated = new WeakSet<DatabaseSync>();

// Runs the conversations migrations once per database handle.
export function ensureConversationsSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "conversations", CONVERSATIONS_MIGRATIONS);
  migrated.add(db);
}
