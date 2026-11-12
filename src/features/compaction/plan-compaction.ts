import type { MessageData } from "../chat/ChatMessageItem.tsx";
import type { ContextBudget } from "../context-window/index.ts";
import {
  isCompacted,
  RECENT_MESSAGES,
  type CompactionPlan,
} from "./compaction-types.ts";

/** Walks back to the user message that opens the exchange at `index`. */
function exchangeStart(body: MessageData[], index: number): number {
  let start = index;
  while (start > 0 && body[start].role !== "user") start -= 1;
  return start;
}

/**
 * Decides what to summarize. Null when the window is not filling up, when
 * there is too little to fold, or when the old part holds a team room (its
 * steps feed the room view). The recent part always opens on a user message,
 * so an exchange is never cut in two, and a broken-off reply stays beside the
 * message it answers because the user may still retry it.
 */
export function planCompaction(
  messages: MessageData[],
  budget: ContextBudget,
): CompactionPlan | null {
  if (!budget.isCompactionRecommended) return null;
  const previous = messages[0] && isCompacted(messages[0]) ? messages[0] : null;
  const body = previous ? messages.slice(1) : messages;
  if (body.length <= RECENT_MESSAGES) return null;

  let split = exchangeStart(body, body.length - RECENT_MESSAGES);
  if (split > 0 && body[split - 1].incomplete) {
    split = exchangeStart(body, split - 1);
  }
  if (split <= 0) return null;

  const older = body.slice(0, split);
  if (older.some((m) => m.crewStep)) return null;
  return { previous, older, recent: body.slice(split) };
}
