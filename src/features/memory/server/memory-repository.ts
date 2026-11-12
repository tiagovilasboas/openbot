import type { DatabaseSync } from "node:sqlite";
import { sanitizeMemoryEntries, type MemoryEntry } from "../memory-entries.ts";
import { ensureMemorySchema } from "./memory-schema.ts";

/** Bots with notes kept on disk; a PUT for a new bot beyond this is refused. */
export const MEMORY_BOTS_MAX = 200;

export type NotesSummary = { botId: string; updatedAt: number; count: number };
export type StoredNotes = {
  entries: MemoryEntry[];
  updatedAt: number | null;
};
export type ReplaceResult =
  | { ok: true; updatedAt: number | null; count: number }
  | { ok: false; error: "too_many_bots" };

/** Bots with at least one note, newest first. */
export function listNotes(db: DatabaseSync): NotesSummary[] {
  ensureMemorySchema(db);
  const rows = db
    .prepare(
      "SELECT bot_id, updated_at, count FROM bot_memory WHERE count > 0 ORDER BY updated_at DESC, bot_id",
    )
    .all() as { bot_id: string; updated_at: number; count: number }[];
  return rows.map((row) => ({
    botId: row.bot_id,
    updatedAt: row.updated_at,
    count: row.count,
  }));
}

// The row is validated again: damaged data reads as an empty list.
export function readNotes(db: DatabaseSync, botId: string): StoredNotes {
  ensureMemorySchema(db);
  const row = db
    .prepare("SELECT data, updated_at FROM bot_memory WHERE bot_id = ?")
    .get(botId) as { data: string; updated_at: number } | undefined;
  if (!row) return { entries: [], updatedAt: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.data);
  } catch {
    return { entries: [], updatedAt: row.updated_at };
  }
  return {
    entries: sanitizeMemoryEntries(parsed),
    updatedAt: row.updated_at,
  };
}

// Replaces the whole list in one transaction. The entries are sanitized here,
// so no caller can store unvalidated data; an empty result deletes the row.
export function replaceNotes(
  db: DatabaseSync,
  botId: string,
  entries: unknown,
): ReplaceResult {
  ensureMemorySchema(db);
  const kept = sanitizeMemoryEntries(entries);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (kept.length === 0) {
      db.prepare("DELETE FROM bot_memory WHERE bot_id = ?").run(botId);
      db.exec("COMMIT");
      return { ok: true, updatedAt: null, count: 0 };
    }
    const existing = db
      .prepare("SELECT 1 FROM bot_memory WHERE bot_id = ?")
      .get(botId);
    if (!existing) {
      const { total } = db
        .prepare("SELECT COUNT(*) AS total FROM bot_memory")
        .get() as { total: number };
      if (total >= MEMORY_BOTS_MAX) {
        db.exec("ROLLBACK");
        return { ok: false, error: "too_many_bots" };
      }
    }
    const now = Date.now();
    db.prepare(
      "INSERT INTO bot_memory (bot_id, data, count, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(bot_id) DO UPDATE SET data = excluded.data, count = excluded.count, updated_at = excluded.updated_at",
    ).run(botId, JSON.stringify(kept), kept.length, now);
    db.exec("COMMIT");
    return { ok: true, updatedAt: now, count: kept.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Removes a bot's notes; idempotent. */
export function deleteNotes(db: DatabaseSync, botId: string): void {
  ensureMemorySchema(db);
  db.prepare("DELETE FROM bot_memory WHERE bot_id = ?").run(botId);
}
