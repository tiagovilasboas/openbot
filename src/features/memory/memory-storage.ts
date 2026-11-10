import { sanitizeMemoryEntries, type MemoryEntry } from "./memory-entries.ts";

/** One key per bot. The global switch uses another prefix on purpose. */
export const MEMORY_KEY_PREFIX = "openbot_memory_";

/** The slice of Storage that memory needs; localStorage satisfies it. */
export type MemoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const EMPTY: MemoryEntry[] = [];
const listeners = new Map<string, Set<() => void>>();
/** Keeps the snapshot stable while the stored text is unchanged. */
const cache = new Map<string, { raw: string; data: MemoryEntry[] }>();

function browserStorage(): MemoryStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

export function memoryKey(botId: string): string {
  return MEMORY_KEY_PREFIX + botId;
}

function notify(botId: string): void {
  listeners.get(botId)?.forEach((listener) => listener());
}

export function subscribeMemory(
  botId: string,
  listener: () => void,
): () => void {
  let set = listeners.get(botId);
  if (!set) {
    set = new Set();
    listeners.set(botId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(botId);
  };
}

/** The bot's saved notes, always re-validated; empty if absent or broken. */
export function loadMemoryEntries(
  botId: string,
  storage: MemoryStorage | undefined = browserStorage(),
): MemoryEntry[] {
  try {
    const raw = storage?.getItem(memoryKey(botId));
    if (!raw) return EMPTY;
    const cached = cache.get(botId);
    if (cached && cached.raw === raw) return cached.data;
    const data = sanitizeMemoryEntries(JSON.parse(raw));
    cache.set(botId, { raw, data });
    return data;
  } catch {
    return EMPTY;
  }
}

/** Saves the list, or removes the key when it is empty. False if blocked. */
export function saveMemoryEntries(
  botId: string,
  entries: readonly MemoryEntry[],
  storage: MemoryStorage | undefined = browserStorage(),
): boolean {
  try {
    if (!storage) return false;
    if (entries.length === 0) storage.removeItem(memoryKey(botId));
    else storage.setItem(memoryKey(botId), JSON.stringify(entries));
    notify(botId);
    return true;
  } catch {
    return false;
  }
}

/** Forgets a bot's notes, for example when the bot is deleted. */
export function deleteBotMemory(
  botId: string,
  storage: MemoryStorage | undefined = browserStorage(),
): void {
  saveMemoryEntries(botId, [], storage);
}
