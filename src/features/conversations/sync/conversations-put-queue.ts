import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import type { ThreadOp, WriteResult } from "./conversations-sync-types.ts";

export interface ConversationsPutQueue {
  /** Queues the latest thread; rapid calls for a bot collapse into one. */
  put(botId: string, messages: MessageData[]): void;
  /** Queues deleting the thread, sent right away. */
  remove(botId: string): void;
  /** Sends what is waiting now and resolves once nothing is left. */
  flush(): Promise<void>;
}

interface QueueOptions {
  send: (botId: string, op: ThreadOp) => Promise<WriteResult>;
  /** `settled` is false when a newer write for the bot is already waiting. */
  onResult?: (botId: string, result: WriteResult, settled: boolean) => void;
  delayMs?: number;
}

interface Slot {
  pending: ThreadOp | null;
  timer: ReturnType<typeof setTimeout> | null;
  running: Promise<void> | null;
}

/**
 * Coalesces writes to /api/conversations per bot: one request in flight per
 * bot, at most one per delay, always carrying the latest thread. It never
 * retries by itself, so a refused write cannot loop; the next save or the
 * next load sends again.
 */
export function createConversationsPutQueue(
  options: QueueOptions,
): ConversationsPutQueue {
  const { send, onResult, delayMs = 300 } = options;
  const slots = new Map<string, Slot>();

  function dropIfIdle(botId: string, slot: Slot): void {
    if (!slot.pending && !slot.timer && !slot.running) slots.delete(botId);
  }

  async function sendOne(botId: string, slot: Slot): Promise<void> {
    const op = slot.pending!;
    slot.pending = null;
    let result: WriteResult;
    try {
      result = await send(botId, op);
    } catch {
      result = { ok: false, failure: { kind: "network" } };
    }
    onResult?.(botId, result, slot.pending === null);
  }

  function schedule(botId: string, slot: Slot, delay: number): void {
    if (slot.timer) clearTimeout(slot.timer);
    slot.timer = null;
    if (slot.running) return; // its end schedules whatever is pending
    slot.timer = setTimeout(() => {
      slot.timer = null;
      void run(botId, slot);
    }, delay);
  }

  function run(botId: string, slot: Slot): Promise<void> {
    slot.running ??= sendOne(botId, slot).finally(() => {
      slot.running = null;
      if (slot.pending) schedule(botId, slot, delayMs);
      else dropIfIdle(botId, slot);
    });
    return slot.running;
  }

  function slotFor(botId: string): Slot {
    let slot = slots.get(botId);
    if (!slot) {
      slot = { pending: null, timer: null, running: null };
      slots.set(botId, slot);
    }
    return slot;
  }

  return {
    put(botId, messages) {
      const slot = slotFor(botId);
      slot.pending = { kind: "put", messages };
      if (!slot.timer) schedule(botId, slot, delayMs);
    },
    remove(botId) {
      const slot = slotFor(botId);
      slot.pending = { kind: "delete" };
      schedule(botId, slot, 0);
    },
    async flush() {
      for (;;) {
        const live = [...slots.values()];
        if (live.length === 0) return;
        for (const [botId, slot] of slots) {
          if (slot.timer) clearTimeout(slot.timer);
          slot.timer = null;
          if (slot.pending) void run(botId, slot);
        }
        await Promise.all(live.map((slot) => slot.running));
        // Let the finally handlers settle before looking again.
        await Promise.resolve();
        if (![...slots.values()].some((s) => s.pending || s.running)) return;
      }
    },
  };
}
