import type { SettingKey, SettingsPatch } from "../settings-types.ts";
import type { WriteResult } from "./settings-sync-types.ts";

export interface SettingsPutQueue {
  /** Queues a change; rapid calls merge, the latest value of a key wins. */
  put(patch: SettingsPatch): void;
  /** Sends what is waiting now and resolves once nothing is left. */
  flush(): Promise<void>;
}

interface QueueOptions {
  send: (patch: SettingsPatch) => Promise<WriteResult>;
  /**
   * `settled` lists the keys of the request that no newer change is waiting
   * on; only those can be marked as delivered.
   */
  onResult?: (
    result: WriteResult,
    sent: SettingKey[],
    settled: SettingKey[],
  ) => void;
  delayMs?: number;
}

/**
 * Coalesces writes to /api/settings: one request in flight, at most one per
 * delay, carrying every key changed meanwhile. It never retries by itself,
 * so a refused write cannot loop; the next change or load sends again.
 */
export function createSettingsPutQueue(
  options: QueueOptions,
): SettingsPutQueue {
  const { send, onResult, delayMs = 300 } = options;
  let pending: SettingsPatch = {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;

  const hasPending = () => Object.keys(pending).length > 0;

  async function sendOnce(): Promise<void> {
    const patch = pending;
    pending = {};
    const sent = Object.keys(patch) as SettingKey[];
    let result: WriteResult;
    try {
      result = await send(patch);
    } catch {
      result = { ok: false, failure: { kind: "network" } };
    }
    onResult?.(
      result,
      sent,
      sent.filter((key) => !(key in pending)),
    );
  }

  function schedule(delay: number): void {
    if (timer) clearTimeout(timer);
    timer = null;
    if (running) return; // its end schedules whatever is pending
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, delay);
  }

  function run(): Promise<void> {
    running ??= sendOnce().finally(() => {
      running = null;
      if (hasPending()) schedule(delayMs);
    });
    return running;
  }

  return {
    put(patch) {
      pending = { ...pending, ...patch };
      if (!timer) schedule(delayMs);
    },
    async flush() {
      for (;;) {
        if (timer) clearTimeout(timer);
        timer = null;
        if (hasPending()) void run();
        if (!running) return;
        await running;
        // Let the finally handler settle before looking again.
        await Promise.resolve();
        if (!hasPending() && !running) return;
      }
    },
  };
}
