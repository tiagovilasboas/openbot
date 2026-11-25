/** Same cap as one chat message, so a post never gets cut on the way. */
export const MAX_CHANNEL_POST_LENGTH = 4_000;
/** The room shows the latest messages; older ones stay stored. */
export const CHANNEL_PAGE_SIZE = 50;

/**
 * Who wrote a message: the person, a specialist answering a delegation or
 * the channel's leader (its kickoff or its final reply).
 */
export type ChannelAuthor =
  /** `replyToSeq`: the message the person answered, which picks the speaker. */
  | { kind: "human"; replyToSeq?: number }
  | { kind: "specialist"; botId: string; task: string; ok: boolean }
  | { kind: "leader"; botId: string }
  /** A group member speaking for itself; `ok` false marks a failed answer. */
  | { kind: "member"; botId: string; ok: boolean };

/** One message of a channel. `seq` orders it: 1, 2, 3… per channel. */
export type ChannelMessage = {
  channelId: string;
  seq: number;
  author: ChannelAuthor;
  text: string;
  /** Epoch ms when it was stored. */
  createdAt: number;
  /** Set on a thread message: the main-timeline message it comments on. */
  parentSeq?: number;
};

/** The sequence after the channel's last one; the first message gets 1. */
export function nextSequence(lastSeq: number | null): number {
  return lastSeq !== null && Number.isSafeInteger(lastSeq) && lastSeq > 0
    ? lastSeq + 1
    : 1;
}

/** Messages in their stable channel order, whatever order they came in. */
export function inChannelOrder(
  messages: readonly ChannelMessage[],
): ChannelMessage[] {
  return [...messages].sort((a, b) => a.seq - b.seq);
}

/** The person's post, trimmed; null when empty or over the cap. */
export function checkChannelPost(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_CHANNEL_POST_LENGTH
    ? trimmed
    : null;
}

function isAuthor(value: unknown): value is ChannelAuthor {
  if (typeof value !== "object" || value === null) return false;
  const raw = value as Record<string, unknown>;
  if (raw.kind === "human") {
    return raw.replyToSeq === undefined || Number.isSafeInteger(raw.replyToSeq);
  }
  if (typeof raw.botId !== "string") return false;
  if (raw.kind === "leader") return true;
  if (raw.kind === "member") return typeof raw.ok === "boolean";
  return (
    raw.kind === "specialist" &&
    typeof raw.task === "string" &&
    typeof raw.ok === "boolean"
  );
}

/** Reads a stored author back; null for a damaged value. */
export function parseChannelAuthor(value: unknown): ChannelAuthor | null {
  return isAuthor(value) ? value : null;
}
