import {
  clearAttention,
  sanitizeAttention,
  type AttentionCounts,
} from "./attention-counts.ts";

const STORAGE_KEY = "openbot_attention";
/** A real map is a few KB; anything bigger is not parsed. */
const RAW_MAX = 50_000;

export const NO_ATTENTION: AttentionCounts = Object.freeze({});

let listeners: Array<() => void> = [];
let cached: { raw: string | null; data: AttentionCounts } = {
  raw: null,
  data: NO_ATTENTION,
};

/** The slice of Storage that attention needs; localStorage satisfies it. */
export type AttentionStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

function browserStorage(): AttentionStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

/** A stable snapshot: the same object until the stored text changes. */
export function loadAttention(
  storage: AttentionStorage | undefined = browserStorage(),
): AttentionCounts {
  try {
    const raw = storage?.getItem(STORAGE_KEY) ?? null;
    if (raw === cached.raw) return cached.data;
    const data =
      raw === null || raw.length > RAW_MAX
        ? NO_ATTENTION
        : sanitizeAttention(JSON.parse(raw));
    cached = { raw, data };
    return data;
  } catch {
    return NO_ATTENTION;
  }
}

export function saveAttention(
  counts: AttentionCounts,
  storage: AttentionStorage | undefined = browserStorage(),
): void {
  try {
    if (Object.keys(counts).length === 0) storage?.removeItem(STORAGE_KEY);
    else storage?.setItem(STORAGE_KEY, JSON.stringify(counts));
    listeners.forEach((listener) => listener());
  } catch {
    // Storage can be blocked; the count then lasts only until reload.
  }
}

/** The bot ids that have an unseen count, for pruning the ones that are gone. */
export function storedAttentionBotIds(
  storage: AttentionStorage | undefined = browserStorage(),
): string[] {
  return Object.keys(loadAttention(storage));
}

/** Forgets a bot's unseen count, for example when the bot is deleted. */
export function forgetBotAttention(
  botId: string,
  storage: AttentionStorage | undefined = browserStorage(),
): void {
  const counts = loadAttention(storage);
  if (botId in counts) saveAttention(clearAttention(counts, botId), storage);
}

export function subscribeAttention(listener: () => void): () => void {
  listeners.push(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
