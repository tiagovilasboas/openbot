import type { MessageData } from "../chat/ChatMessageItem.tsx";

/** Messages kept verbatim after the summary. */
export const RECENT_MESSAGES = 6;

/**
 * The summary is sent back as one history entry and the server cuts each
 * entry at 4000 characters, so the summary leaves room for its wrapper.
 */
export const SUMMARY_MAX_CHARS = 3000;

/** Originals kept inside the marker; the newest win, the count stays true. */
export const ARCHIVED_MAX = 400;

/** What the marker message keeps of the turns it replaced. */
export interface CompactedMeta {
  /** How many messages the summary stands for, across every compaction. */
  originalCount: number;
  /** ISO time of the latest compaction. */
  compactedAt: string;
  /** The replaced messages, shown read-only and never sent to the model. */
  archived: MessageData[];
}

/** The messages to summarize and the ones that stay as they are. */
export interface CompactionPlan {
  /** The marker of an earlier compaction, folded into the new one. */
  previous: MessageData | null;
  older: MessageData[];
  recent: MessageData[];
}

export function isCompacted(
  message: MessageData,
): message is MessageData & { compacted: CompactedMeta } {
  return message.compacted !== undefined;
}
