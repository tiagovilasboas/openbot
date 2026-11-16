import type { BotProfile } from "../bots/bot-types.ts";
import type { MessageData } from "../chat/ChatMessageItem.tsx";

/** Why an agent is waiting on the user, most pressing first. */
export type NeedsYouReason = "approval" | "failed" | "unread";

export interface NeedsYouItem {
  botId: string;
  reason: NeedsYouReason;
  /** Only for "unread": how many replies are new. */
  count?: number;
}

/** The last reply broke off with an error, so a retry could help. */
export function lastReplyFailed(messages: readonly MessageData[]): boolean {
  const last = messages[messages.length - 1];
  return last?.role === "assistant" && last.incomplete === "error";
}

export interface NeedsYouInput {
  /** Bots the user can see, in list order. */
  bots: readonly Pick<BotProfile, "id">[];
  activeBotId: string;
  /** The bot whose tool turn waits for an approval, if any. */
  approvalBotId?: string | null;
  /** Bots whose last reply failed. */
  failedBotIds: ReadonlySet<string>;
  /** Replies per bot the user has not seen yet. */
  attentionCounts: Readonly<Record<string, number>>;
}

/**
 * The agents waiting on the user, in list order, one entry per agent with its
 * most pressing reason. The open agent is on screen, so only a pending
 * approval (it blocks the turn) still counts for it.
 */
export function needsYouItems(input: NeedsYouInput): NeedsYouItem[] {
  const items: NeedsYouItem[] = [];
  for (const { id } of input.bots) {
    if (input.approvalBotId === id) {
      items.push({ botId: id, reason: "approval" });
      continue;
    }
    if (id === input.activeBotId) continue;
    if (input.failedBotIds.has(id)) {
      items.push({ botId: id, reason: "failed" });
      continue;
    }
    const count = input.attentionCounts[id] ?? 0;
    if (count > 0) items.push({ botId: id, reason: "unread", count });
  }
  return items;
}
