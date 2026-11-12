import type { MessageData } from "../chat/ChatMessageItem.tsx";
import {
  ARCHIVED_MAX,
  SUMMARY_MAX_CHARS,
  type CompactionPlan,
} from "./compaction-types.ts";

/** How many leading messages of the thread the plan replaces. */
export function consumedCount(plan: CompactionPlan): number {
  return (plan.previous ? 1 : 0) + plan.older.length;
}

/** True while the thread still starts with the messages the plan was made on. */
export function planStillFits(
  messages: MessageData[],
  plan: CompactionPlan,
): boolean {
  const planned = [...(plan.previous ? [plan.previous] : []), ...plan.older];
  return planned.every((m, i) => messages[i]?.id === m.id);
}

/**
 * The thread after compaction: one marker carrying the summary, then every
 * message the plan kept (and any queued after them). The replaced messages
 * move into the marker, so nothing is lost, and the marker keeps the id of
 * the first one it replaces to stay unique and in order.
 */
export function applyCompaction(
  messages: MessageData[],
  plan: CompactionPlan,
  summaryText: string,
  now: Date,
): MessageData[] {
  const first = plan.previous ?? plan.older[0];
  const before = plan.previous?.compacted;
  const archived = [...(before?.archived ?? []), ...plan.older];
  const marker: MessageData = {
    id: first.id,
    role: "assistant",
    language: plan.recent[0]?.language ?? first.language,
    text: summaryText.trim().slice(0, SUMMARY_MAX_CHARS),
    compacted: {
      originalCount: (before?.originalCount ?? 0) + plan.older.length,
      compactedAt: now.toISOString(),
      archived: archived.slice(-ARCHIVED_MAX),
    },
  };
  return [marker, ...messages.slice(consumedCount(plan))];
}
