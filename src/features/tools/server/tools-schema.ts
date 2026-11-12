import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones.
export const TOOLS_MIGRATIONS: readonly MigrationStep[] = [
  `CREATE TABLE tool_pending_turns (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','completed','denied','expired')),
    transcript TEXT NOT NULL,
    pending_calls TEXT NOT NULL,
    request_digest TEXT NOT NULL,
    steps_used INTEGER NOT NULL,
    calls_used INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  "CREATE UNIQUE INDEX tool_pending_one_per_bot ON tool_pending_turns (bot_id) WHERE status = 'pending'",
  `CREATE TABLE tool_grants (
    bot_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    granted_at INTEGER NOT NULL,
    PRIMARY KEY (bot_id, tool_name)
  )`,
  `CREATE TABLE tool_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    bot_id TEXT NOT NULL,
    turn_id TEXT NOT NULL,
    call_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    policy TEXT NOT NULL,
    decision TEXT NOT NULL,
    outcome TEXT NOT NULL,
    args_sha256 TEXT NOT NULL,
    duration_ms INTEGER NOT NULL
  )`,
];

const migrated = new WeakSet<DatabaseSync>();

// Runs the tools migrations once per database handle.
export function ensureToolsSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "tools", TOOLS_MIGRATIONS);
  migrated.add(db);
}
