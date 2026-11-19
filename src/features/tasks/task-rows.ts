import type { Thread } from "../threads/thread-model.ts";

export interface TaskBot {
  id: string;
  name: string;
}

export interface TaskRow {
  key: string;
  botId: string;
  botName: string;
  thread: Thread;
  /** A turn is in flight on this thread. */
  running: boolean;
}

interface TaskSource {
  bot: TaskBot;
  threads: readonly Thread[];
  /** The thread the chat shows for this bot: where a running turn lands. */
  selectedThreadId: string;
}

/**
 * One row per thread of every bot, running first and then the most recently
 * active. The implicit default thread has no stored activity time (0), so it
 * sorts after the threads that do, in bot order.
 */
export function buildTaskRows(
  sources: readonly TaskSource[],
  workingBotIds: readonly string[],
): TaskRow[] {
  const rows: TaskRow[] = [];
  for (const { bot, threads, selectedThreadId } of sources) {
    const working = workingBotIds.includes(bot.id);
    for (const thread of threads) {
      rows.push({
        key: `${bot.id}/${thread.id}`,
        botId: bot.id,
        botName: bot.name,
        thread,
        running: working && thread.id === selectedThreadId,
      });
    }
  }
  return rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        Number(b.row.running) - Number(a.row.running) ||
        b.row.thread.updatedAt - a.row.thread.updatedAt ||
        a.index - b.index,
    )
    .map(({ row }) => row);
}

/** A short "how long ago" label key; null when the time is unknown. */
export function ageBucket(
  updatedAt: number,
  now: number,
): { unit: "now" | "minutes" | "hours" | "days"; value: number } | null {
  if (!updatedAt) return null;
  const minutes = Math.max(0, Math.floor((now - updatedAt) / 60_000));
  if (minutes < 1) return { unit: "now", value: 0 };
  if (minutes < 60) return { unit: "minutes", value: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: "hours", value: hours };
  return { unit: "days", value: Math.floor(hours / 24) };
}
