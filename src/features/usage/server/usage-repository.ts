import type { DatabaseSync } from "node:sqlite";
import { sanitizeUsage } from "../sanitize-usage.ts";
import type { UsageRecord } from "../usage-record.ts";
import { ensureUsageSchema } from "./usage-schema.ts";

export type StoredUsage = { records: UsageRecord[]; updatedAt: number | null };
export type ReplacedUsage = { updatedAt: number | null; count: number };

// The row is validated again: damaged data reads as an empty log.
export function readUsage(db: DatabaseSync): StoredUsage {
  ensureUsageSchema(db);
  const row = db
    .prepare("SELECT data, updated_at FROM usage_log WHERE id = 1")
    .get() as { data: string; updated_at: number } | undefined;
  if (!row) return { records: [], updatedAt: null };
  try {
    return {
      records: sanitizeUsage(JSON.parse(row.data)),
      updatedAt: row.updated_at,
    };
  } catch {
    return { records: [], updatedAt: row.updated_at };
  }
}

// Replaces the whole log in one transaction; last write wins across tabs.
// The records are sanitized here, so no caller can store unvalidated data;
// an empty result clears the log.
export function replaceUsage(
  db: DatabaseSync,
  records: unknown,
): ReplacedUsage {
  ensureUsageSchema(db);
  const kept = sanitizeUsage(records);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (kept.length === 0) {
      db.exec("DELETE FROM usage_log");
      db.exec("COMMIT");
      return { updatedAt: null, count: 0 };
    }
    const now = Date.now();
    db.prepare(
      "INSERT INTO usage_log (id, data, count, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, count = excluded.count, updated_at = excluded.updated_at",
    ).run(JSON.stringify(kept), kept.length, now);
    db.exec("COMMIT");
    return { updatedAt: now, count: kept.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Clears the log; idempotent. */
export function clearUsage(db: DatabaseSync): void {
  ensureUsageSchema(db);
  db.exec("DELETE FROM usage_log");
}
