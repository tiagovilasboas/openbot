export interface QueuedMessage {
  id: number;
  text: string;
  conversationId: number;
}

export interface MessageQueue {
  enqueue(item: QueuedMessage): void;
  dequeue(): QueuedMessage | undefined;
  peek(): QueuedMessage | undefined;
  size(): number;
  clear(): void;
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
    getAll() {
      return [...items];
    },
  };
}
