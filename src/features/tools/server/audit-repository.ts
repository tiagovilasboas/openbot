import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { ensureToolsSchema } from "./tools-schema.ts";

export const AUDIT_MAX_ROWS = 1000;

export type AuditEntry = {
  at: number;
  botId: string;
  turnId: string;
  callId: string;
  toolName: string;
  policy: string;
  decision: string;
  outcome: string;
  durationMs: number;
};

export type AuditRecord = AuditEntry & { id: number; argsSha256: string };

export const digestArgs = (argsJson: string): string =>
  createHash("sha256").update(argsJson, "utf8").digest("hex");

// Appends one row and trims the log to the newest AUDIT_MAX_ROWS. The raw
// arguments are never stored, only their sha256 digest.
export function appendAudit(
  db: DatabaseSync,
  entry: AuditEntry,
  argsJson: string,
): void {
  ensureToolsSchema(db);
  db.prepare(
    "INSERT INTO tool_audit (at, bot_id, turn_id, call_id, tool_name, policy, decision, outcome, args_sha256, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    entry.at,
    entry.botId,
    entry.turnId,
    entry.callId,
    entry.toolName,
    entry.policy,
    entry.decision,
    entry.outcome,
    digestArgs(argsJson),
    entry.durationMs,
  );
  db.prepare(
    "DELETE FROM tool_audit WHERE id <= (SELECT MAX(id) FROM tool_audit) - ?",
  ).run(AUDIT_MAX_ROWS);
}

type AuditRow = {
  id: number;
  at: number;
  bot_id: string;
  turn_id: string;
  call_id: string;
  tool_name: string;
  policy: string;
  decision: string;
  outcome: string;
  args_sha256: string;
  duration_ms: number;
};

export function listRecentAudit(db: DatabaseSync, limit = 50): AuditRecord[] {
  ensureToolsSchema(db);
  const capped = Math.min(Math.max(1, Math.floor(limit)), AUDIT_MAX_ROWS);
  const rows = db
    .prepare("SELECT * FROM tool_audit ORDER BY id DESC LIMIT ?")
    .all(capped) as AuditRow[];
  return rows.map((row) => ({
    id: row.id,
    at: row.at,
    botId: row.bot_id,
    turnId: row.turn_id,
    callId: row.call_id,
    toolName: row.tool_name,
    policy: row.policy,
    decision: row.decision,
    outcome: row.outcome,
    argsSha256: row.args_sha256,
    durationMs: row.duration_ms,
  }));
}
