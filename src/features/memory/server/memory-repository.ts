import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  addMemoryEntry,
  sanitizeMemoryEntries,
  type MemoryEditFailure,
  type MemoryEntry,
} from "../memory-entries.ts";
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

export type AppendNoteResult =
  | { ok: true; entry: MemoryEntry; count: number; updatedAt: number }
  | {
      ok: false;
      error: Exclude<MemoryEditFailure, "not_found"> | "too_many_bots";
    };

// Adds one note to the bot's stored list in one transaction, with the same
// per-note, count and total caps as a user edit. Older notes are never
// trimmed to make room: a full list refuses the new note.
export function appendNote(
  db: DatabaseSync,
  botId: string,
  text: unknown,
  now = Date.now(),
): AppendNoteResult {
  ensureMemorySchema(db);
  const id = `mem_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  db.exec("BEGIN IMMEDIATE");
  try {
    const existing = db
      .prepare("SELECT 1 FROM bot_memory WHERE bot_id = ?")
      .get(botId);
    const added = addMemoryEntry(
      readNotes(db, botId).entries,
      text,
      id,
      new Date(now),
    );
    if (!added.ok) {
      db.exec("ROLLBACK");
      return {
        ok: false,
        error: added.reason === "not_found" ? "empty" : added.reason,
      };
    }
    if (!existing) {
      const { total } = db
        .prepare("SELECT COUNT(*) AS total FROM bot_memory")
        .get() as { total: number };
      if (total >= MEMORY_BOTS_MAX) {
        db.exec("ROLLBACK");
        return { ok: false, error: "too_many_bots" };
      }
    }
    const entries = added.entries;
    db.prepare(
      "INSERT INTO bot_memory (bot_id, data, count, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(bot_id) DO UPDATE SET data = excluded.data, count = excluded.count, updated_at = excluded.updated_at",
    ).run(botId, JSON.stringify(entries), entries.length, now);
    db.exec("COMMIT");
    return {
      ok: true,
      entry: entries[entries.length - 1],
      count: entries.length,
      updatedAt: now,
    };
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
