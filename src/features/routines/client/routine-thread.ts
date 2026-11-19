import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import type { ChatLanguage } from "../../chat/respond-to-message.ts";
import type { RoutineRun } from "./routines-api.ts";

const THREAD_ID_MAX = 40;
const PREFIX = "routine-";

/** A short stable hash, for routine ids too long to fit a thread id. */
function shortHash(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = (h * 33 + value.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** The thread a routine's runs go to; the same routine always maps to it. */
export function routineThreadId(routineId: string): string {
  const id = `${PREFIX}${routineId}`;
  return id.length <= THREAD_ID_MAX
    ? id
    : `${PREFIX}${routineId.slice(0, 20)}-${shortHash(routineId)}`;
}

export type RunMessages = {
  messages: MessageData[];
  /** Every run seen as finished and handled, with or without a message. */
  handledRunIds: number[];
};

/**
 * The messages for runs not handled yet, oldest first, numbered after the
 * thread's own. Failed, running, silent and empty runs get no message but are
 * still marked handled, so a re-sync never revisits them.
 */
export function runsToMessages(
  runs: readonly RoutineRun[],
  existing: readonly MessageData[],
  handledRunIds: ReadonlySet<number>,
  language: ChatLanguage,
): RunMessages {
  const fresh = runs
    .filter((r) => r.finishedAt !== null && !handledRunIds.has(r.id))
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0) || a.id - b.id);
  let nextId = existing.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  const messages: MessageData[] = [];
  for (const run of fresh) {
    const text = run.output?.trim();
    if (run.status !== "succeeded" || run.nothingNew === true || !text)
      continue;
    messages.push({ id: nextId++, language, role: "assistant", text });
  }
  return { messages, handledRunIds: fresh.map((r) => r.id) };
}
