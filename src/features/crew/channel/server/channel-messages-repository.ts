import type { DatabaseSync } from "node:sqlite";
import {
  CHANNEL_PAGE_SIZE,
  inChannelOrder,
  nextSequence,
  parseChannelAuthor,
  type ChannelAuthor,
  type ChannelMessage,
} from "../channel-message.ts";
import { checkParallelLimit } from "../channel-limits.ts";
import { ensureCrewChannelsSchema } from "./channels-schema.ts";

type MessageRow = {
  channel_id: string;
  seq: number;
  author: string;
  text: string;
  created_at: number;
};

function fromRow(row: MessageRow): ChannelMessage | null {
  let author: ChannelAuthor | null = null;
  try {
    author = parseChannelAuthor(JSON.parse(row.author));
  } catch {
    return null;
  }
  if (!author) return null;
  return {
    channelId: row.channel_id,
    seq: row.seq,
    author,
    text: row.text,
    createdAt: row.created_at,
  };
}

/**
 * Stores a message at the channel's next sequence. The read and the insert
 * share one transaction, so two writers never get the same number.
 */
export function appendMessage(
  db: DatabaseSync,
  channelId: string,
  author: ChannelAuthor,
  text: string,
  now: number,
): ChannelMessage {
  ensureCrewChannelsSchema(db);
  db.exec("BEGIN IMMEDIATE");
  try {
    const last = db
      .prepare(
        "SELECT MAX(seq) AS seq FROM crew_channel_messages WHERE channel_id = ?",
      )
      .get(channelId) as { seq: number | null };
    const seq = nextSequence(last.seq);
    db.prepare(
      "INSERT INTO crew_channel_messages (channel_id, seq, author, text, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(channelId, seq, JSON.stringify(author), text, now);
    db.exec("COMMIT");
    return { channelId, seq, author, text, createdAt: now };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** The channel's latest messages, oldest first. */
export function listMessages(
  db: DatabaseSync,
  channelId: string,
  limit: number = CHANNEL_PAGE_SIZE,
): ChannelMessage[] {
  ensureCrewChannelsSchema(db);
  const rows = db
    .prepare(
      "SELECT channel_id, seq, author, text, created_at FROM crew_channel_messages WHERE channel_id = ? ORDER BY seq DESC LIMIT ?",
    )
    .all(channelId, limit) as MessageRow[];
  return inChannelOrder(
    rows.map(fromRow).filter((m): m is ChannelMessage => m !== null),
  );
}

/** A turn still "running" after this long died with its process. */
export const STALE_TURN_MS = 10 * 60 * 1000;

/**
 * Starts a turn unless the channel already runs as many as AU-01 allows.
 * Returns the turn id, or null when the channel is busy. A stale turn no
 * longer counts, so a crash never locks a channel.
 */
export function claimTurn(
  db: DatabaseSync,
  channelId: string,
  now: number,
): number | null {
  ensureCrewChannelsSchema(db);
  db.exec("BEGIN IMMEDIATE");
  try {
    const { active } = db
      .prepare(
        "SELECT COUNT(*) AS active FROM crew_channel_turns WHERE channel_id = ? AND status = 'running' AND started_at > ?",
      )
      .get(channelId, now - STALE_TURN_MS) as { active: number };
    if (!checkParallelLimit(active).allowed) {
      db.exec("COMMIT");
      return null;
    }
    const result = db
      .prepare(
        "INSERT INTO crew_channel_turns (channel_id, status, started_at) VALUES (?, 'running', ?)",
      )
      .run(channelId, now);
    db.exec("COMMIT");
    return Number(result.lastInsertRowid);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/**
 * Ends a turn; a finished turn no longer counts against the limit. A turn
 * already stopped stays stopped: a late finish never revives it.
 */
export function finishTurn(
  db: DatabaseSync,
  turnId: number,
  status: "completed" | "failed",
  now: number,
): void {
  ensureCrewChannelsSchema(db);
  db.prepare(
    "UPDATE crew_channel_turns SET status = ?, finished_at = ?, speaking_bot_id = NULL WHERE id = ? AND status = 'running'",
  ).run(status, now, turnId);
}

/** Who is answering right now in a running turn; null between speakers. */
export function setSpeaking(
  db: DatabaseSync,
  turnId: number,
  botId: string | null,
): void {
  ensureCrewChannelsSchema(db);
  db.prepare(
    "UPDATE crew_channel_turns SET speaking_bot_id = ? WHERE id = ? AND status = 'running'",
  ).run(botId, turnId);
}

/** True once the turn is no longer running (stopped, superseded or done). */
export function isTurnOver(db: DatabaseSync, turnId: number): boolean {
  ensureCrewChannelsSchema(db);
  const row = db
    .prepare("SELECT status FROM crew_channel_turns WHERE id = ?")
    .get(turnId) as { status: string } | undefined;
  return row?.status !== "running";
}

/** Stops every running turn of the channel; how many it stopped. */
export function stopRunningTurns(
  db: DatabaseSync,
  channelId: string,
  now: number,
): number {
  ensureCrewChannelsSchema(db);
  const result = db
    .prepare(
      "UPDATE crew_channel_turns SET status = 'stopped', finished_at = ?, speaking_bot_id = NULL WHERE channel_id = ? AND status = 'running'",
    )
    .run(now, channelId);
  return Number(result.changes);
}

export type RunningTurn = { id: number; speakingBotId: string | null };

/** The channel's live turn, if any; a stale one does not count. */
export function runningTurn(
  db: DatabaseSync,
  channelId: string,
  now: number,
): RunningTurn | null {
  ensureCrewChannelsSchema(db);
  const row = db
    .prepare(
      "SELECT id, speaking_bot_id FROM crew_channel_turns WHERE channel_id = ? AND status = 'running' AND started_at > ? ORDER BY id DESC LIMIT 1",
    )
    .get(channelId, now - STALE_TURN_MS) as
    { id: number; speaking_bot_id: string | null } | undefined;
  return row ? { id: row.id, speakingBotId: row.speaking_bot_id } : null;
}
