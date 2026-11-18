import { DEFAULT_THREAD_ID } from "./thread-model.ts";

const selected = new Map<string, string>();
const listeners = new Set<() => void>();

/** Which of the bot's threads the chat shows; the default until chosen. */
export function selectedThreadId(botId: string): string {
  return selected.get(botId) ?? DEFAULT_THREAD_ID;
}

export function selectThread(botId: string, threadId: string): void {
  if (selectedThreadId(botId) === threadId) return;
  if (threadId === DEFAULT_THREAD_ID) selected.delete(botId);
  else selected.set(botId, threadId);
  listeners.forEach((l) => l());
}

export function subscribeThreadSelection(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
