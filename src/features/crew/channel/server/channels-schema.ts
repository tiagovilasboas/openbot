import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones.
export const CREW_CHANNELS_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE crew_channels (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE crew_channel_messages (channel_id TEXT NOT NULL REFERENCES crew_channels(id) ON DELETE CASCADE, seq INTEGER NOT NULL, author TEXT NOT NULL, text TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (channel_id, seq))",
  "CREATE TABLE crew_channel_turns (id INTEGER PRIMARY KEY AUTOINCREMENT, channel_id TEXT NOT NULL REFERENCES crew_channels(id) ON DELETE CASCADE, status TEXT NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER)",
  "CREATE INDEX crew_channel_turns_active ON crew_channel_turns (channel_id, status)",
  "ALTER TABLE crew_channel_turns ADD COLUMN speaking_bot_id TEXT",
  // A thread message points at the main-timeline message it comments on.
  "ALTER TABLE crew_channel_messages ADD COLUMN parent_seq INTEGER",
  // A member's tool call waiting for the person: the paused turn lives in
  // tool_pending_turns (turn_id); this keeps what the group needs to go on.
  "CREATE TABLE crew_channel_approvals (turn_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL REFERENCES crew_channels(id) ON DELETE CASCADE, group_turn_id INTEGER NOT NULL, bot_id TEXT NOT NULL, parent_seq INTEGER, remaining TEXT NOT NULL, calls TEXT NOT NULL, expires_at INTEGER NOT NULL)",
];

const migrated = new WeakSet<DatabaseSync>();

// Runs the crew channel migrations once per database handle.
export function ensureCrewChannelsSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "crew_channels", CREW_CHANNELS_MIGRATIONS);
  migrated.add(db);
}
