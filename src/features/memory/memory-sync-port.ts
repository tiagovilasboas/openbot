import type { MemoryEntry } from "./memory-entries.ts";

/**
 * What the notes cache tells whoever mirrors it to the server. The cache
 * stays synchronous; the sync is injected so rendering never waits on it.
 */
export interface MemorySyncPort {
  /** A bot's notes were saved locally; the server copy is now behind. */
  saved(botId: string, entries: MemoryEntry[]): void;
  /** A bot's notes were dropped locally; the server copy must go too. */
  forgotten(botId: string): void;
}

let port: MemorySyncPort | null = null;

export function connectMemorySync(next: MemorySyncPort | null): void {
  port = next;
}

export function currentMemorySync(): MemorySyncPort | null {
  return port;
}
