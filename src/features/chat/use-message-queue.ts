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

  return {
    queueCount,
    enqueue,
    dequeue,
    clearQueue,
  };
}
