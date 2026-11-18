import {
  THREADS_KEY_PREFIX,
  storableThreads,
  withDefaultThread,
  type Thread,
} from "./thread-model.ts";

const cache = new Map<string, { raw: string | null; threads: Thread[] }>();
const listeners = new Map<string, Set<() => void>>();

function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function subscribeThreads(botId: string, l: () => void): () => void {
  const set = listeners.get(botId) ?? new Set<() => void>();
  listeners.set(botId, set);
  set.add(l);
  return () => {
    set.delete(l);
    if (set.size === 0) listeners.delete(botId);
  };
}

/** The bot's threads, default first; the same array until storage changes. */
export function loadThreads(
  botId: string,
  storage: Pick<Storage, "getItem"> | undefined = browserStorage(),
): Thread[] {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(THREADS_KEY_PREFIX + botId) ?? null;
  } catch {
    raw = null;
  }
  const cached = cache.get(botId);
  if (cached && cached.raw === raw) return cached.threads;
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const threads = withDefaultThread(botId, parsed);
  cache.set(botId, { raw, threads });
  return threads;
}

export function saveThreads(
  botId: string,
  threads: readonly Thread[],
  storage:
    Pick<Storage, "setItem" | "removeItem"> | undefined = browserStorage(),
): void {
  const extras = storableThreads(threads);
  try {
    if (extras.length === 0) storage?.removeItem(THREADS_KEY_PREFIX + botId);
    else storage?.setItem(THREADS_KEY_PREFIX + botId, JSON.stringify(extras));
  } catch {
    // Blocked storage: the list stays as it was.
  }
  listeners.get(botId)?.forEach((l) => l());
}
