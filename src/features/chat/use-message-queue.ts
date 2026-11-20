import { useCallback, useRef, useState } from "react";
import { createMessageQueue, type QueuedMessage } from "./message-queue.ts";

export type { QueuedMessage };

export function useMessageQueue() {
  const [queueCount, setQueueCount] = useState(0);
  const queueRef = useRef(createMessageQueue());

  const enqueue = useCallback((item: QueuedMessage) => {
    queueRef.current.enqueue(item);
    setQueueCount(queueRef.current.size());
  }, []);

  const dequeue = useCallback((): QueuedMessage | undefined => {
    const next = queueRef.current.dequeue();
    setQueueCount(queueRef.current.size());
    return next;
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current.clear();
    setQueueCount(0);
  }, []);

  /** The newest queued message jumps ahead of the others. */
  const promoteLast = useCallback(() => queueRef.current.promoteLast(), []);

  return {
    queueCount,
    promoteLast,
    enqueue,
    dequeue,
    clearQueue,
  };
}
