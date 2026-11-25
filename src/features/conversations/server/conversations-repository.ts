import type { DatabaseSync } from "node:sqlite";
import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import { sanitizeStoredMessages } from "../../chat/stored-message.ts";
import { ensureConversationsSchema } from "./conversations-schema.ts";

/**
 * Rows kept on disk; a PUT for a new (bot, thread) beyond this is refused.
 * It counts threads, not bots.
 */
export const THREADS_MAX = 200;

export const DEFAULT_THREAD_ID = "default";

export type ThreadSummary = { botId: string; updatedAt: number; count: number };
export type StoredThread = {
  messages: MessageData[];
  updatedAt: number | null;
};
export type ReplaceResult =
  | { ok: true; updatedAt: number | null; count: number }
  | { ok: false; error: "too_many_threads" };

/** Threads of one id (the default thread) with messages, newest first. */
export function listThreads(
  db: DatabaseSync,
  threadId: string = DEFAULT_THREAD_ID,
): ThreadSummary[] {
  ensureConversationsSchema(db);
  const rows = db
    .prepare(
      "SELECT bot_id, updated_at, count FROM conversations WHERE count > 0 AND thread_id = ? ORDER BY updated_at DESC, bot_id",
    )
    .all(threadId) as { bot_id: string; updated_at: number; count: number }[];
  return rows.map((row) => ({
    botId: row.bot_id,
    updatedAt: row.updated_at,
    count: row.count,
  }));
}

// The row is validated again: damaged data reads as an empty thread.
export function readThread(
  db: DatabaseSync,
  botId: string,
  threadId: string = DEFAULT_THREAD_ID,
): StoredThread {
  ensureConversationsSchema(db);
  const row = db
    .prepare(
      "SELECT data, updated_at FROM conversations WHERE bot_id = ? AND thread_id = ?",
    )
    .get(botId, threadId) as { data: string; updated_at: number } | undefined;
  if (!row) return { messages: [], updatedAt: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.data);
  } catch {
    return { messages: [], updatedAt: row.updated_at };
  }
  return {
    messages: sanitizeStoredMessages(parsed),
    updatedAt: row.updated_at,
  };
}

// Replaces the whole thread in one transaction. The messages are sanitized
// here, so no caller can store unvalidated data; an empty result deletes it.
export function replaceThread(
  db: DatabaseSync,
  botId: string,
  messages: unknown,
  threadId: string = DEFAULT_THREAD_ID,
): ReplaceResult {
  ensureConversationsSchema(db);
  const kept = sanitizeStoredMessages(messages);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (kept.length === 0) {
      db.prepare(
        "DELETE FROM conversations WHERE bot_id = ? AND thread_id = ?",
      ).run(botId, threadId);
      db.exec("COMMIT");
      return { ok: true, updatedAt: null, count: 0 };
    }
    const existing = db
      .prepare("SELECT 1 FROM conversations WHERE bot_id = ? AND thread_id = ?")
      .get(botId, threadId);
    if (!existing) {
      const { total } = db
        .prepare("SELECT COUNT(*) AS total FROM conversations")
        .get() as { total: number };
      if (total >= THREADS_MAX) {
        db.exec("ROLLBACK");
        return { ok: false, error: "too_many_threads" };
      }
    }
    const now = Date.now();
    db.prepare(
      "INSERT INTO conversations (bot_id, thread_id, data, count, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(bot_id, thread_id) DO UPDATE SET data = excluded.data, count = excluded.count, updated_at = excluded.updated_at",
    ).run(botId, threadId, JSON.stringify(kept), kept.length, now);
    db.exec("COMMIT");
    return { ok: true, updatedAt: now, count: kept.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Removes a thread; idempotent. */
export function deleteThread(
  db: DatabaseSync,
  botId: string,
  threadId: string = DEFAULT_THREAD_ID,
): void {
  ensureConversationsSchema(db);
  db.prepare(
    "DELETE FROM conversations WHERE bot_id = ? AND thread_id = ?",
  ).run(botId, threadId);
}

/** Each bot's latest update across all of its threads with messages. */
export function latestUpdateByBot(db: DatabaseSync): Map<string, number> {
  ensureConversationsSchema(db);
  const rows = db
    .prepare(
      "SELECT bot_id, MAX(updated_at) AS updated_at FROM conversations WHERE count > 0 GROUP BY bot_id",
    )
    .all() as { bot_id: string; updated_at: number }[];
  return new Map(rows.map((row) => [row.bot_id, row.updated_at]));
}
