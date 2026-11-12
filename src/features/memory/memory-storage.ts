import {
  keySuffixes,
  type KeyListingStorage,
} from "../../shared/storage/key-suffixes.ts";
import { sanitizeMemoryEntries, type MemoryEntry } from "./memory-entries.ts";
import { currentMemorySync } from "./memory-sync-port.ts";

/** One key per bot. The global switch uses another prefix on purpose. */
export const MEMORY_KEY_PREFIX = "openbot_memory_";

/** The slice of Storage that memory needs; localStorage satisfies it. */
export type MemoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** A valid list is far smaller; a longer stored text is not parsed at all. */
export const MEMORY_MAX_STORED_LENGTH = 100_000;

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
    if (!raw || raw.length > MEMORY_MAX_STORED_LENGTH) return EMPTY;
    const cached = cache.get(botId);
    if (cached && cached.raw === raw) return cached.data;
    const data = sanitizeMemoryEntries(JSON.parse(raw));
    cache.set(botId, { raw, data });
    return data;
  } catch {
    return EMPTY;
  }
}

/**
 * Saves the list, or removes the key when it is empty, and queues it for the
 * server. The load passes `sync: false` to mirror what the server holds
 * without sending it back. False if the browser storage is blocked.
 */
export function saveMemoryEntries(
  botId: string,
  entries: readonly MemoryEntry[],
  storage: MemoryStorage | undefined = browserStorage(),
  options: { sync?: boolean } = {},
): boolean {
  let saved = false;
  try {
    if (storage) {
      if (entries.length === 0) storage.removeItem(memoryKey(botId));
      else storage.setItem(memoryKey(botId), JSON.stringify(entries));
      notify(botId);
      saved = true;
    }
  } catch {
    // Blocked storage: the server copy can still be kept.
  }
  if (options.sync !== false) currentMemorySync()?.saved(botId, [...entries]);
  return saved;
}

/** The bot ids that have notes saved, for pruning the ones that are gone. */
export function storedMemoryBotIds(
  storage: KeyListingStorage | undefined = browserStorage() as
    KeyListingStorage | undefined,
): string[] {
  return keySuffixes(storage, MEMORY_KEY_PREFIX);
}

/** Forgets a bot's notes here and on the server, e.g. when the bot is deleted. */
export function deleteBotMemory(
  botId: string,
  storage: MemoryStorage | undefined = browserStorage(),
): void {
  saveMemoryEntries(botId, [], storage, { sync: false });
  currentMemorySync()?.forgotten(botId);
}
