import { notifySettingsChanged } from "../settings/settings-sync-port.ts";
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

/** The saved switch; undefined while the user never turned memory off. */
export function loadStoredMemoryEnabled(
  storage: MemoryStorage | undefined = browserStorage(),
): boolean | undefined {
  try {
    return storage?.getItem(MEMORY_SWITCH_KEY) === OFF ? false : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Saves the switch and queues it for the server. The load passes
 * `sync: false` to mirror what the server holds without sending it back.
 */
export function saveMemoryEnabled(
  enabled: boolean,
  storage: MemoryStorage | undefined = browserStorage(),
  options: { sync?: boolean } = {},
): void {
  try {
    if (!storage) return;
    if (enabled) storage.removeItem(MEMORY_SWITCH_KEY);
    else storage.setItem(MEMORY_SWITCH_KEY, OFF);
    listeners.forEach((listener) => listener());
  } catch {
    // Storage can be blocked; the switch then stays as it was.
    return;
  }
  if (options.sync !== false) notifySettingsChanged({ memoryEnabled: enabled });
}

export function subscribeMemoryEnabled(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
