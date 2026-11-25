import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones.
export const CONVERSATIONS_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE conversations (bot_id TEXT PRIMARY KEY, data TEXT NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  addThreadId,
];

// v2: primary key (bot_id, thread_id). Existing rows become thread 'default'.
// Runs inside the step's transaction, so a failure leaves v1 intact.
export function addThreadId(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE conversations_v2 (bot_id TEXT NOT NULL, thread_id TEXT NOT NULL, data TEXT NOT NULL, count INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (bot_id, thread_id))",
  );
  db.exec(
    "INSERT INTO conversations_v2 (bot_id, thread_id, data, count, updated_at) SELECT bot_id, 'default', data, count, updated_at FROM conversations",
  );
  db.exec("DROP TABLE conversations");
  db.exec("ALTER TABLE conversations_v2 RENAME TO conversations");
}

const migrated = new WeakSet<DatabaseSync>();

// Runs the conversations migrations once per database handle.
export function ensureConversationsSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "conversations", CONVERSATIONS_MIGRATIONS);
  migrated.add(db);
}
