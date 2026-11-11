import type { MessageData } from "./ChatMessageItem.tsx";

/**
 * What the thread cache tells whoever mirrors it to the server. The cache
 * stays synchronous; the sync is injected so rendering never waits on it.
 */
export interface MessagesSyncPort {
  /** The thread was saved locally; the server copy is now behind. */
  saved(botId: string, messages: MessageData[]): void;
  /** The thread was dropped locally; the server copy must go too. */
  forgotten(botId: string): void;
}

let port: MessagesSyncPort | null = null;

export function connectMessagesSync(next: MessagesSyncPort | null): void {
  port = next;
}

export function currentMessagesSync(): MessagesSyncPort | null {
  return port;
}
