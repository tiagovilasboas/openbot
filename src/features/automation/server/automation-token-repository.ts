import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";
import { safeEqual } from "../../server-guard/check-access-token.ts";

// Append new steps; never edit or reorder applied ones.
export const AUTOMATION_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE automation_token (id INTEGER PRIMARY KEY CHECK (id = 1), token_hash TEXT NOT NULL, created_at INTEGER NOT NULL)",
];

const migrated = new WeakSet<DatabaseSync>();

function ensureSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "automation", AUTOMATION_MIGRATIONS);
  migrated.add(db);
}

/** Only this hash is stored; the plaintext exists once, in the response. */
export function hashAutomationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type AutomationTokenStatus =
  { exists: false } | { exists: true; createdAt: number };

export function automationTokenStatus(db: DatabaseSync): AutomationTokenStatus {
  ensureSchema(db);
  const row = db
    .prepare("SELECT created_at FROM automation_token WHERE id = 1")
    .get() as { created_at: number } | undefined;
  return row ? { exists: true, createdAt: row.created_at } : { exists: false };
}

/** Creates or rotates the token. Returns the plaintext, shown only once. */
export function createAutomationToken(
  db: DatabaseSync,
  now: number,
  randomToken: () => string = () => randomBytes(32).toString("base64url"),
): string {
  ensureSchema(db);
  const token = `obt_${randomToken()}`;
  db.prepare(
    "INSERT INTO automation_token (id, token_hash, created_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, created_at = excluded.created_at",
  ).run(hashAutomationToken(token), now);
  return token;
}

/** True when a token was removed. */
export function revokeAutomationToken(db: DatabaseSync): boolean {
  ensureSchema(db);
  return Number(db.prepare("DELETE FROM automation_token").run().changes) > 0;
}

/** Constant-time check of a presented token against the stored hash. */
export function verifyAutomationToken(
  db: DatabaseSync,
  presented: string,
): "no_token_configured" | "valid" | "invalid" {
  ensureSchema(db);
  const row = db
    .prepare("SELECT token_hash FROM automation_token WHERE id = 1")
    .get() as { token_hash: string } | undefined;
  if (!row) return "no_token_configured";
  return safeEqual(hashAutomationToken(presented), row.token_hash)
    ? "valid"
    : "invalid";
}
