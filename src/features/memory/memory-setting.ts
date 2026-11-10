import type { MemoryStorage } from "./memory-storage.ts";

/**
 * The global "use memory" switch. It is ON unless the user turned it off.
 * Its key does not start with the per-bot prefix, so no bot id can hit it.
 */
export const MEMORY_SWITCH_KEY = "openbot_use_memory";
const OFF = "off";

let listeners: Array<() => void> = [];

function browserStorage(): MemoryStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

export function loadMemoryEnabled(
  storage: MemoryStorage | undefined = browserStorage(),
): boolean {
  try {
    return storage?.getItem(MEMORY_SWITCH_KEY) !== OFF;
  } catch {
    return true;
  }
}

export function saveMemoryEnabled(
  enabled: boolean,
  storage: MemoryStorage | undefined = browserStorage(),
): void {
  try {
    if (!storage) return;
    if (enabled) storage.removeItem(MEMORY_SWITCH_KEY);
    else storage.setItem(MEMORY_SWITCH_KEY, OFF);
    listeners.forEach((listener) => listener());
  } catch {
    // Storage can be blocked; the switch then stays as it was.
  }
}

export function subscribeMemoryEnabled(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
