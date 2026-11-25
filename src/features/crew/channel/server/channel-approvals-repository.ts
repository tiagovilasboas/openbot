import type { DatabaseSync } from "node:sqlite";
import { closePendingTurn } from "../../../tools/server/pending-turns-repository.ts";
import type { ApprovalCall } from "../../../tools/tool-turn-events.ts";
import { ensureCrewChannelsSchema } from "./channels-schema.ts";

/** A group member's tool call waiting for the person, and what comes next. */
export type ChannelApproval = {
  /** The paused tool turn, in tool_pending_turns. */
  turnId: string;
  channelId: string;
  /** The group turn that stays running while the person decides. */
  groupTurnId: number;
  botId: string;
  /** The thread the turn answers in; null on the main timeline. */
  parentSeq: number | null;
  /** The members that still answer after this one. */
  remaining: string[];
  calls: ApprovalCall[];
  expiresAt: number;
};

type Row = {
  turn_id: string;
  channel_id: string;
  group_turn_id: number;
  bot_id: string;
  parent_seq: number | null;
  remaining: string;
  calls: string;
  expires_at: number;
};

function fromRow(row: Row): ChannelApproval | null {
  try {
    return {
      turnId: row.turn_id,
      channelId: row.channel_id,
      groupTurnId: row.group_turn_id,
      botId: row.bot_id,
      parentSeq: row.parent_seq,
      remaining: JSON.parse(row.remaining) as string[],
      calls: JSON.parse(row.calls) as ApprovalCall[],
      expiresAt: row.expires_at,
    };
  } catch {
    return null;
  }
}

export function saveApproval(db: DatabaseSync, approval: ChannelApproval) {
  ensureCrewChannelsSchema(db);
  db.prepare(
    "INSERT OR REPLACE INTO crew_channel_approvals (turn_id, channel_id, group_turn_id, bot_id, parent_seq, remaining, calls, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    approval.turnId,
    approval.channelId,
    approval.groupTurnId,
    approval.botId,
    approval.parentSeq,
    JSON.stringify(approval.remaining),
    JSON.stringify(approval.calls),
    approval.expiresAt,
  );
}

/**
 * The approval the room shows (main timeline, or the thread under
 * `parentSeq`): only while its group turn still runs and it has not expired.
 */
export function listApproval(
  db: DatabaseSync,
  channelId: string,
  parentSeq: number | null,
  now: number,
): ChannelApproval | null {
  ensureCrewChannelsSchema(db);
  const row = db
    .prepare(
      `SELECT a.* FROM crew_channel_approvals a
       JOIN crew_channel_turns t ON t.id = a.group_turn_id
       WHERE a.channel_id = ? AND a.parent_seq IS ? AND a.expires_at > ?
         AND t.status = 'running'
       ORDER BY a.group_turn_id DESC LIMIT 1`,
    )
    .get(channelId, parentSeq, now) as Row | undefined;
  return row ? fromRow(row) : null;
}

/** Claims the approval so it resumes once; null when it is gone or taken. */
export function takeApproval(
  db: DatabaseSync,
  channelId: string,
  turnId: string,
): ChannelApproval | null {
  ensureCrewChannelsSchema(db);
  const row = db
    .prepare(
      "SELECT * FROM crew_channel_approvals WHERE channel_id = ? AND turn_id = ?",
    )
    .get(channelId, turnId) as Row | undefined;
  if (!row) return null;
  const removed = db
    .prepare("DELETE FROM crew_channel_approvals WHERE turn_id = ?")
    .run(turnId);
  return Number(removed.changes) > 0 ? fromRow(row) : null;
}

/**
 * Drops every approval of the channel and expires the paused turns behind
 * them: Stop and a new post both end what was waiting. How many it dropped.
 */
export function cancelApprovals(db: DatabaseSync, channelId: string): number {
  ensureCrewChannelsSchema(db);
  const rows = db
    .prepare("SELECT turn_id FROM crew_channel_approvals WHERE channel_id = ?")
    .all(channelId) as { turn_id: string }[];
  for (const { turn_id } of rows) closePendingTurn(db, turn_id, "expired");
  db.prepare("DELETE FROM crew_channel_approvals WHERE channel_id = ?").run(
    channelId,
  );
  return rows.length;
}
