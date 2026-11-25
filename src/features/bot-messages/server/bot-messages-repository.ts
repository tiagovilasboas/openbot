import type { DatabaseSync } from "node:sqlite";
import { migrate } from "../../../shared/local-store/migrate.ts";

export const HOUR_MS = 3_600_000;

// Append new steps; never edit or reorder applied ones.
const MIGRATIONS = [
  "CREATE TABLE bot_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, from_bot TEXT NOT NULL, to_bot TEXT NOT NULL, text TEXT NOT NULL, sent_at INTEGER NOT NULL)",
  "CREATE INDEX bot_messages_by_sender ON bot_messages (from_bot, sent_at)",
];

const migrated = new WeakSet<DatabaseSync>();

function ensureSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "bot_messages", MIGRATIONS);
  migrated.add(db);
}

export type SentMessage = {
  fromBot: string;
  toBot: string;
  text: string;
  sentAt: number;
};

type Row = { from_bot: string; to_bot: string; text: string; sent_at: number };

/** Messages sent by one bot in the hour before `now`. */
export function countSentInLastHour(
  db: DatabaseSync,
  fromBot: string,
  now: number,
): number {
  ensureSchema(db);
  const row = db
    .prepare(
      "SELECT COUNT(*) AS n FROM bot_messages WHERE from_bot = ? AND sent_at > ?",
    )
    .get(fromBot, now - HOUR_MS) as { n: number };
  return row.n;
}

/** Messages between two bots, either way, in the hour before `now`, oldest first. */
export function pairMessagesInLastHour(
  db: DatabaseSync,
  botA: string,
  botB: string,
  now: number,
): SentMessage[] {
  ensureSchema(db);
  const rows = db
    .prepare(
      `SELECT from_bot, to_bot, text, sent_at FROM bot_messages
       WHERE sent_at > ? AND ((from_bot = ? AND to_bot = ?) OR (from_bot = ? AND to_bot = ?))
       ORDER BY sent_at, id`,
    )
    .all(now - HOUR_MS, botA, botB, botB, botA) as Row[];
  return rows.map((r) => ({
    fromBot: r.from_bot,
    toBot: r.to_bot,
    text: r.text,
    sentAt: r.sent_at,
  }));
}

/** Stores a sent message and drops what is older than a day. */
export function recordMessage(db: DatabaseSync, message: SentMessage): void {
  ensureSchema(db);
  db.prepare("DELETE FROM bot_messages WHERE sent_at < ?").run(
    message.sentAt - 24 * HOUR_MS,
  );
  db.prepare(
    "INSERT INTO bot_messages (from_bot, to_bot, text, sent_at) VALUES (?, ?, ?, ?)",
  ).run(message.fromBot, message.toBot, message.text, message.sentAt);
}
