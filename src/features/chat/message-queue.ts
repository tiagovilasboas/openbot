import type { AttachmentPayload } from "../attachments/parse-attachments.ts";

export interface QueuedMessage {
  id: number;
  text: string;
  conversationId: number;
  /** The files sent with this message; they wait in the queue with it. */
  attachments?: AttachmentPayload[];
}

export interface MessageQueue {
  enqueue(item: QueuedMessage): void;
  dequeue(): QueuedMessage | undefined;
  peek(): QueuedMessage | undefined;
  size(): number;
  clear(): void;
  /** Moves the newest message to the front; false when nothing waits. */
  promoteLast(): boolean;
  getAll(): readonly QueuedMessage[];
}

export function createMessageQueue(): MessageQueue {
  const items: QueuedMessage[] = [];

  return {
    enqueue(item: QueuedMessage) {
      items.push(item);
    },
    dequeue() {
      return items.shift();
    },
    peek() {
      return items[0];
    },
    size() {
      return items.length;
    },
    clear() {
      items.length = 0;
    },
    promoteLast() {
      const last = items.pop();
      if (!last) return false;
      items.unshift(last);
      return true;
    },
    getAll() {
      return [...items];
    },
  };
}
