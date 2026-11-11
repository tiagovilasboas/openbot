import { sanitizeAttention, type AttentionCounts } from "./attention-counts.ts";

const STORAGE_KEY = "openbot_attention";
/** A real map is a few KB; anything bigger is not parsed. */
const RAW_MAX = 50_000;

export const NO_ATTENTION: AttentionCounts = Object.freeze({});

let listeners: Array<() => void> = [];
let cached: { raw: string | null; data: AttentionCounts } = {
  raw: null,
  data: NO_ATTENTION,
};

function browserStorage(): Storage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

/** A stable snapshot: the same object until the stored text changes. */
export function loadAttention(storage = browserStorage()): AttentionCounts {
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
  storage = browserStorage(),
): void {
  try {
    if (Object.keys(counts).length === 0) storage?.removeItem(STORAGE_KEY);
    else storage?.setItem(STORAGE_KEY, JSON.stringify(counts));
    listeners.forEach((listener) => listener());
  } catch {
    // Storage can be blocked; the count then lasts only until reload.
  }
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
