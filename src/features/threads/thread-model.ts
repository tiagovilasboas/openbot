/** The thread every bot already has: its messages keep the original key. */
export const DEFAULT_THREAD_ID = "default";

/** Joins a bot id and a thread id in a storage key; bot ids never contain it. */
export const THREAD_KEY_SEPARATOR = "~";

/** One key per bot: the list of its threads besides the implicit default. */
export const THREADS_KEY_PREFIX = "openbot_threads_";

export const THREAD_TITLE_MAX = 80;

export interface Thread {
  id: string;
  botId: string;
  /** Null until named: the list then shows a placeholder in its language. */
  title: string | null;
  createdAt: number;
  updatedAt: number;
  /** Set on a branch: the thread it was copied from. */
  parentThreadId?: string;
  /** Set on a branch: the last message copied from the parent. */
  branchedFromMessageId?: number;
}

/** The id the thread's messages are stored under; the default is the bot id. */
export function messageStorageId(botId: string, threadId: string): string {
  return threadId === DEFAULT_THREAD_ID
    ? botId
    : `${botId}${THREAD_KEY_SEPARATOR}${threadId}`;
}

/** The bot id inside a storage id, whether or not it names a thread. */
export function botIdOfStorageId(storageId: string): string {
  return storageId.split(THREAD_KEY_SEPARATOR)[0];
}

export function isDefaultThread(threadId: string): boolean {
  return threadId === DEFAULT_THREAD_ID;
}

export function defaultThread(botId: string): Thread {
  return {
    id: DEFAULT_THREAD_ID,
    botId,
    title: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

const THREAD_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export function cleanTitle(title: string): string | null {
  const trimmed = title.trim().slice(0, THREAD_TITLE_MAX);
  return trimmed === "" ? null : trimmed;
}

/** A fresh thread; `id` comes from the caller so this stays deterministic. */
export function newThread(
  botId: string,
  id: string,
  now: number,
  fields: Partial<
    Pick<Thread, "title" | "parentThreadId" | "branchedFromMessageId">
  > = {},
): Thread {
  return {
    id,
    botId,
    title: fields.title ? cleanTitle(fields.title) : null,
    createdAt: now,
    updatedAt: now,
    ...(fields.parentThreadId ? { parentThreadId: fields.parentThreadId } : {}),
    ...(fields.branchedFromMessageId !== undefined
      ? { branchedFromMessageId: fields.branchedFromMessageId }
      : {}),
  };
}

function sanitizeThread(botId: string, value: unknown): Thread | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || !THREAD_ID_PATTERN.test(v.id)) return null;
  if (v.id === DEFAULT_THREAD_ID) return null;
  const num = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) ? n : 0;
  const thread: Thread = {
    id: v.id,
    botId,
    title: typeof v.title === "string" ? cleanTitle(v.title) : null,
    createdAt: num(v.createdAt),
    updatedAt: num(v.updatedAt),
  };
  if (typeof v.parentThreadId === "string") {
    thread.parentThreadId = v.parentThreadId;
  }
  if (typeof v.branchedFromMessageId === "number") {
    thread.branchedFromMessageId = v.branchedFromMessageId;
  }
  return thread;
}

/**
 * The bot's threads from whatever was stored, default first. Nothing stored,
 * or an unreadable list, is the migration case: the bot's one existing thread
 * becomes the default and no message moves.
 */
export function withDefaultThread(botId: string, stored: unknown): Thread[] {
  const seen = new Set<string>();
  const extras: Thread[] = [];
  for (const item of Array.isArray(stored) ? stored : []) {
    const thread = sanitizeThread(botId, item);
    if (!thread || seen.has(thread.id)) continue;
    seen.add(thread.id);
    extras.push(thread);
  }
  extras.sort((a, b) => a.createdAt - b.createdAt);
  return [defaultThread(botId), ...extras];
}

/** What gets stored: every thread except the implicit default. */
export function storableThreads(threads: readonly Thread[]): Thread[] {
  return threads.filter((t) => !isDefaultThread(t.id));
}

export function renameThread(
  threads: readonly Thread[],
  id: string,
  title: string,
  now: number,
): Thread[] {
  return threads.map((t) =>
    t.id === id && !isDefaultThread(id)
      ? { ...t, title: cleanTitle(title), updatedAt: now }
      : t,
  );
}

/** The default thread cannot be removed: it is the one the server mirrors. */
export function removeThread(threads: readonly Thread[], id: string): Thread[] {
  return isDefaultThread(id)
    ? [...threads]
    : threads.filter((t) => t.id !== id);
}

/** The thread to show: the wanted one if it still exists, else the default. */
export function resolveThreadId(
  threads: readonly Thread[],
  wanted: string,
): string {
  return threads.some((t) => t.id === wanted) ? wanted : DEFAULT_THREAD_ID;
}
