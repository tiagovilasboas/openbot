import type { WriteResult } from "../../conversations/sync/conversations-sync-types.ts";
import type { UsageRecord } from "../usage-record.ts";

export interface UsagePutQueue {
  /** Queues the latest log; rapid calls collapse into one request. */
  put(records: readonly UsageRecord[]): void;
  /** Sends what is waiting now and resolves once nothing is left. */
  flush(): Promise<void>;
}

interface QueueOptions {
  send: (records: readonly UsageRecord[]) => Promise<WriteResult>;
  /** `settled` is false when a newer write is already waiting. */
  onResult?: (result: WriteResult, settled: boolean) => void;
  delayMs?: number;
}

/**
 * Coalesces writes to /api/usage: one request in flight, at most one per
 * delay, always carrying the latest log. It never retries by itself, so a
 * refused write cannot loop; the next save or the next load sends again.
 */
export function createUsagePutQueue(options: QueueOptions): UsagePutQueue {
  const { send, onResult, delayMs = 300 } = options;
  let pending: readonly UsageRecord[] | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;

  async function sendOne(): Promise<void> {
    const records = pending!;
    pending = null;
    let result: WriteResult;
    try {
      result = await send(records);
    } catch {
      result = { ok: false, failure: { kind: "network" } };
    }
    onResult?.(result, pending === null);
  }

  function schedule(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    if (running) return; // its end schedules whatever is pending
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, delayMs);
  }

  function run(): Promise<void> {
    running ??= sendOne().finally(() => {
      running = null;
      if (pending) schedule();
    });
    return running;
  }

  return {
    put(records) {
      pending = records;
      if (!timer) schedule();
    },
    async flush() {
      while (pending || running) {
        if (timer) clearTimeout(timer);
        timer = null;
        if (pending) void run();
        await running;
        // Let the finally handler settle before looking again.
        await Promise.resolve();
      }
    },
  };
}
