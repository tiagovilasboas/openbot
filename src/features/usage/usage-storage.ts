import type { TokenUsage } from "../model/token-usage.ts";
import { sanitizeUsage } from "./sanitize-usage.ts";
import { localDay } from "./usage-day.ts";
import { addCall, clearBot, type UsageRecord } from "./usage-record.ts";
import { currentUsageSync } from "./usage-sync-port.ts";

/** Local metric only: it is not part of the backup on purpose. */
export const USAGE_STORAGE_KEY = "openbot_usage";

/** The slice of Storage that usage needs; localStorage satisfies it. */
export type UsageStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** A valid log is about 1 MB at most; a longer stored text is not parsed. */
export const USAGE_MAX_STORED_LENGTH = 2_000_000;

const EMPTY: UsageRecord[] = [];
const listeners = new Set<() => void>();
/** Keeps the snapshot stable while the stored text is unchanged. */
let cache: { raw: string; data: UsageRecord[] } | null = null;

function browserStorage(): UsageStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Also follows changes made in another tab. */
export function subscribeUsage(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === USAGE_STORAGE_KEY || event.key === null) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** The saved records, always re-validated; empty if absent or broken. */
export function loadUsage(
  storage: UsageStorage | undefined = browserStorage(),
): UsageRecord[] {
  try {
    const raw = storage?.getItem(USAGE_STORAGE_KEY);
    if (!raw || raw.length > USAGE_MAX_STORED_LENGTH) return EMPTY;
    if (cache && cache.raw === raw) return cache.data;
    const data = sanitizeUsage(JSON.parse(raw));
    cache = { raw, data };
    return data;
  } catch {
    return EMPTY;
  }
}

/**
 * Saves the list, or removes the key when it is empty. False if blocked.
 * `sync: false` is for mirroring the server's copy, which must not go back.
 */
export function saveUsage(
  records: readonly UsageRecord[],
  storage: UsageStorage | undefined = browserStorage(),
  options: { sync?: boolean } = {},
): boolean {
  try {
    if (!storage) return false;
    if (records.length === 0) storage.removeItem(USAGE_STORAGE_KEY);
    else storage.setItem(USAGE_STORAGE_KEY, JSON.stringify(records));
    notify();
    if (options.sync !== false) currentUsageSync()?.saved(records);
    return true;
  } catch {
    return false;
  }
}

/**
 * Notes one finished reply of `botId`, on the local day of `now`. Never
 * throws: counting usage must not break a chat turn.
 */
export function recordUsageCall(
  botId: string,
  usage: TokenUsage | undefined,
  now: Date = new Date(),
  storage: UsageStorage | undefined = browserStorage(),
): void {
  try {
    saveUsage(
      addCall(loadUsage(storage), botId, usage, localDay(now)),
      storage,
    );
  } catch {
    // Metrics are best effort.
  }
}

/** The bot ids that have usage recorded, for pruning the ones that are gone. */
export function storedUsageBotIds(
  storage: UsageStorage | undefined = browserStorage(),
): string[] {
  return [...new Set(loadUsage(storage).map((r) => r.botId))];
}

/** Forgets a bot's usage, for example when the bot is deleted. */
export function clearBotUsage(
  botId: string,
  storage: UsageStorage | undefined = browserStorage(),
): void {
  saveUsage(clearBot(loadUsage(storage), botId), storage);
}

export function clearAllUsage(
  storage: UsageStorage | undefined = browserStorage(),
): void {
  saveUsage([], storage);
}
