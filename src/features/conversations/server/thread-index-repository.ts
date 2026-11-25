import type { DatabaseSync } from "node:sqlite";
import { isValidThreadId } from "../../threads/thread-model.ts";
import { ensureThreadIndexSchema } from "./thread-index-schema.ts";

export { isValidThreadId };

/** Threads kept per bot; a PUT with more is refused. */
export const THREAD_INDEX_MAX_PER_BOT = 200;
export const THREAD_INDEX_TITLE_MAX = 80;

export type ThreadIndexEntry = {
  id: string;
  title: string | null;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ThreadIndexError =
  "too_many_threads" | "invalid_thread" | "duplicate_thread";

export type ReplaceIndexResult =
  { ok: true } | { ok: false; error: ThreadIndexError };

const isTimestamp = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

/** Returns a clean entry, or null when the value is not a valid one. */
export function sanitizeEntry(value: unknown): ThreadIndexEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const e = value as Record<string, unknown>;
  if (!isValidThreadId(e.id)) return null;
  const title = e.title ?? null;
  if (
    title !== null &&
    (typeof title !== "string" || title.length > THREAD_INDEX_TITLE_MAX)
  ) {
    return null;
  }
  if (e.pinned !== undefined && typeof e.pinned !== "boolean") return null;
  if (!isTimestamp(e.createdAt) || !isTimestamp(e.updatedAt)) return null;
  return {
    id: e.id,
    title,
    pinned: e.pinned === true,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

/** The bot's threads in the order they were stored. */
export function readThreadIndex(
  db: DatabaseSync,
  botId: string,
): ThreadIndexEntry[] {
  ensureThreadIndexSchema(db);
  const rows = db
    .prepare(
      "SELECT thread_id, title, pinned, created_at, updated_at FROM thread_index WHERE bot_id = ? ORDER BY position",
    )
    .all(botId) as {
    thread_id: string;
    title: string | null;
    pinned: number;
    created_at: number;
    updated_at: number;
  }[];
  return rows.map((r) => ({
    id: r.thread_id,
    title: r.title,
    pinned: r.pinned === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/** Replaces the bot's whole list atomically; other bots are untouched. */
export function replaceThreadIndex(
  db: DatabaseSync,
  botId: string,
  entries: unknown[],
): ReplaceIndexResult {
  ensureThreadIndexSchema(db);
  if (entries.length > THREAD_INDEX_MAX_PER_BOT) {
    return { ok: false, error: "too_many_threads" };
  }
  const clean: ThreadIndexEntry[] = [];
  const seen = new Set<string>();
  for (const raw of entries) {
    const entry = sanitizeEntry(raw);
    if (!entry) return { ok: false, error: "invalid_thread" };
    if (seen.has(entry.id)) return { ok: false, error: "duplicate_thread" };
    seen.add(entry.id);
    clean.push(entry);
  }
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM thread_index WHERE bot_id = ?").run(botId);
    const insert = db.prepare(
      "INSERT INTO thread_index (bot_id, thread_id, title, pinned, created_at, updated_at, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    clean.forEach((e, i) =>
      insert.run(
        botId,
        e.id,
        e.title,
        e.pinned ? 1 : 0,
        e.createdAt,
        e.updatedAt,
        i,
      ),
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { ok: true };
}
