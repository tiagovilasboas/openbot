import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { ensureToolsSchema } from "./tools-schema.ts";

export const PENDING_TURN_TTL_MS = 15 * 60 * 1000;
export const TRANSCRIPT_MAX_BYTES = 256 * 1024;

export type PendingTurnStatus = "pending" | "completed" | "denied" | "expired";

export type PendingTurn = {
  id: string;
  botId: string;
  status: PendingTurnStatus;
  transcript: string;
  pendingCalls: string;
  requestDigest: string;
  stepsUsed: number;
  callsUsed: number;
  createdAt: number;
  expiresAt: number;
};

export type NewPendingTurn = Omit<
  PendingTurn,
  "id" | "status" | "createdAt" | "expiresAt"
>;

export type CreatedTurn =
  | { ok: true; turn: PendingTurn }
  | { ok: false; error: "transcript_too_large" };

type Row = {
  id: string;
  bot_id: string;
  status: PendingTurnStatus;
  transcript: string;
  pending_calls: string;
  request_digest: string;
  steps_used: number;
  calls_used: number;
  created_at: number;
  expires_at: number;
};

const fromRow = (row: Row): PendingTurn => ({
  id: row.id,
  botId: row.bot_id,
  status: row.status,
  transcript: row.transcript,
  pendingCalls: row.pending_calls,
  requestDigest: row.request_digest,
  stepsUsed: row.steps_used,
  callsUsed: row.calls_used,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
});

// Stores a new pending turn for the bot, expiring any older pending one (a
// bot has at most one). The transcript is capped.
export function createPendingTurn(
  db: DatabaseSync,
  input: NewPendingTurn,
  now = Date.now(),
): CreatedTurn {
  ensureToolsSchema(db);
  if (Buffer.byteLength(input.transcript, "utf8") > TRANSCRIPT_MAX_BYTES) {
    return { ok: false, error: "transcript_too_large" };
  }
  const turn: PendingTurn = {
    ...input,
    id: randomUUID(),
    status: "pending",
    createdAt: now,
    expiresAt: now + PENDING_TURN_TTL_MS,
  };
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE tool_pending_turns SET status = 'expired' WHERE bot_id = ? AND status = 'pending'",
    ).run(turn.botId);
    db.prepare(
      "INSERT INTO tool_pending_turns (id, bot_id, status, transcript, pending_calls, request_digest, steps_used, calls_used, created_at, expires_at) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      turn.id,
      turn.botId,
      turn.transcript,
      turn.pendingCalls,
      turn.requestDigest,
      turn.stepsUsed,
      turn.callsUsed,
      turn.createdAt,
      turn.expiresAt,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { ok: true, turn };
}

// The bot's live pending turn, or null. Overdue turns are marked expired
// first, so they read as absent.
export function loadPendingTurn(
  db: DatabaseSync,
  botId: string,
  now = Date.now(),
): PendingTurn | null {
  ensureToolsSchema(db);
  expireOverdueTurns(db, now);
  const row = db
    .prepare(
      "SELECT * FROM tool_pending_turns WHERE bot_id = ? AND status = 'pending'",
    )
    .get(botId) as Row | undefined;
  return row ? fromRow(row) : null;
}

// Closes a pending turn exactly once; false when it was not pending.
export function closePendingTurn(
  db: DatabaseSync,
  id: string,
  status: "completed" | "denied" | "expired",
): boolean {
  ensureToolsSchema(db);
  const result = db
    .prepare(
      "UPDATE tool_pending_turns SET status = ? WHERE id = ? AND status = 'pending'",
    )
    .run(status, id);
  return Number(result.changes) > 0;
}

// A new non-resume message invalidates the bot's pending turn.
export function expirePendingForBot(db: DatabaseSync, botId: string): number {
  ensureToolsSchema(db);
  const result = db
    .prepare(
      "UPDATE tool_pending_turns SET status = 'expired' WHERE bot_id = ? AND status = 'pending'",
    )
    .run(botId);
  return Number(result.changes);
}

export function expireOverdueTurns(db: DatabaseSync, now = Date.now()): number {
  ensureToolsSchema(db);
  const result = db
    .prepare(
      "UPDATE tool_pending_turns SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?",
    )
    .run(now);
  return Number(result.changes);
}
