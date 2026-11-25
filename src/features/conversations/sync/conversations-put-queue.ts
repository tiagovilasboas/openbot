import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import {
  DEFAULT_THREAD_ID,
  messageStorageId,
} from "../../threads/thread-model.ts";
import type { ThreadOp, WriteResult } from "./conversations-sync-types.ts";

export interface ConversationsPutQueue {
  /** Queues the latest thread; rapid calls for a thread collapse into one. */
  put(botId: string, messages: MessageData[], threadId?: string): void;
  /** Queues deleting the thread, sent right away. */
  remove(botId: string, threadId?: string): void;
  /** Sends what is waiting now and resolves once nothing is left. */
  flush(): Promise<void>;
}

interface QueueOptions {
  send: (botId: string, op: ThreadOp, threadId: string) => Promise<WriteResult>;
  /** `settled` is false when a newer write for the thread is already waiting. */
  onResult?: (
    botId: string,
    result: WriteResult,
    settled: boolean,
    threadId: string,
  ) => void;
  delayMs?: number;
}

interface Slot {
  botId: string;
  threadId: string;
  pending: ThreadOp | null;
  timer: ReturnType<typeof setTimeout> | null;
  running: Promise<void> | null;
}

/**
 * Coalesces writes to /api/conversations per thread: one request in flight
 * per (bot, thread), at most one per delay, always carrying the latest thread. It never
 * retries by itself, so a refused write cannot loop; the next save or the
 * next load sends again.
 */
export function createConversationsPutQueue(
  options: QueueOptions,
): ConversationsPutQueue {
  const { send, onResult, delayMs = 300 } = options;
  const slots = new Map<string, Slot>();

  function dropIfIdle(slot: Slot): void {
    if (!slot.pending && !slot.timer && !slot.running) {
      slots.delete(messageStorageId(slot.botId, slot.threadId));
    }
  }

  async function sendOne(slot: Slot): Promise<void> {
    const { botId, threadId } = slot;
    const op = slot.pending!;
    slot.pending = null;
    let result: WriteResult;
    try {
      result = await send(botId, op, threadId);
    } catch {
      result = { ok: false, failure: { kind: "network" } };
    }
    onResult?.(botId, result, slot.pending === null, threadId);
  }

  function schedule(slot: Slot, delay: number): void {
    if (slot.timer) clearTimeout(slot.timer);
    slot.timer = null;
    if (slot.running) return; // its end schedules whatever is pending
    slot.timer = setTimeout(() => {
      slot.timer = null;
      void run(slot);
    }, delay);
  }

  function run(slot: Slot): Promise<void> {
    slot.running ??= sendOne(slot).finally(() => {
      slot.running = null;
      if (slot.pending) schedule(slot, delayMs);
      else dropIfIdle(slot);
    });
    return slot.running;
  }

  function slotFor(botId: string, threadId: string): Slot {
    const key = messageStorageId(botId, threadId);
    let slot = slots.get(key);
    if (!slot) {
      slot = { botId, threadId, pending: null, timer: null, running: null };
      slots.set(key, slot);
    }
    return slot;
  }

  return {
    put(botId, messages, threadId = DEFAULT_THREAD_ID) {
      const slot = slotFor(botId, threadId);
      slot.pending = { kind: "put", messages };
      if (!slot.timer) schedule(slot, delayMs);
    },
    remove(botId, threadId = DEFAULT_THREAD_ID) {
      const slot = slotFor(botId, threadId);
      slot.pending = { kind: "delete" };
      schedule(slot, 0);
    },
    async flush() {
      for (;;) {
        const live = [...slots.values()];
        if (live.length === 0) return;
        for (const slot of slots.values()) {
          if (slot.timer) clearTimeout(slot.timer);
          slot.timer = null;
          if (slot.pending) void run(slot);
        }
        await Promise.all(live.map((slot) => slot.running));
        // Let the finally handlers settle before looking again.
        await Promise.resolve();
        if (![...slots.values()].some((s) => s.pending || s.running)) return;
      }
    },
  };
}
