import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";
import type { ServerTurn } from "../../bots/server/ask-bot-on-server.ts";

/** Turns of one chat sent back to the model as context. */
export const TELEGRAM_CONTEXT_TURNS = 20;
/** Rows kept per chat; older ones are deleted on write. */
const KEEP_ROWS = 200;

// Append new steps; never edit or reorder applied ones.
const STEPS: readonly MigrationStep[] = [
  "CREATE TABLE telegram_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL)",
  "CREATE INDEX telegram_messages_by_chat ON telegram_messages (chat_id, id)",
  "CREATE TABLE telegram_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
];

const migrated = new WeakSet<DatabaseSync>();
function ensure(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "telegram", STEPS);
  migrated.add(db);
}

export function appendTurn(
  db: DatabaseSync,
  chatId: string,
  turn: ServerTurn,
  now: number,
): void {
  ensure(db);
  db.prepare(
    "INSERT INTO telegram_messages (chat_id, role, text, at) VALUES (?, ?, ?, ?)",
  ).run(chatId, turn.role, turn.text, now);
  db.prepare(
    "DELETE FROM telegram_messages WHERE chat_id = ? AND id NOT IN (SELECT id FROM telegram_messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?)",
  ).run(chatId, chatId, KEEP_ROWS);
}

/** The chat's last turns, oldest first, starting with the user. */
export function recentTurns(
  db: DatabaseSync,
  chatId: string,
  limit = TELEGRAM_CONTEXT_TURNS,
): ServerTurn[] {
  ensure(db);
  const rows = db
    .prepare(
      "SELECT role, text FROM telegram_messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?",
    )
    .all(chatId, limit) as { role: string; text: string }[];
  const turns = rows.reverse().map((r) => ({
    role: r.role === "assistant" ? ("assistant" as const) : ("user" as const),
    text: r.text,
  }));
  while (turns[0]?.role === "assistant") turns.shift();
  return turns;
}

export function clearChat(db: DatabaseSync, chatId: string): void {
  ensure(db);
  db.prepare("DELETE FROM telegram_messages WHERE chat_id = ?").run(chatId);
}

/** The next update id to ask for, kept so a restart does not replay. */
export function readOffset(db: DatabaseSync): number {
  ensure(db);
  const row = db
    .prepare("SELECT value FROM telegram_state WHERE key = 'offset'")
    .get() as { value: string } | undefined;
  const value = Number(row?.value);
  return Number.isSafeInteger(value) ? value : 0;
}

export function writeOffset(db: DatabaseSync, offset: number): void {
  ensure(db);
  db.prepare(
    "INSERT INTO telegram_state (key, value) VALUES ('offset', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(String(offset));
}
