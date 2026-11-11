import type { ApiResult, BotsPayload } from "./bots-sync-types.ts";

export interface BotsPutQueue {
  /** Queues the latest state; rapid calls collapse into one request. */
  enqueue(payload: BotsPayload): void;
  /** Sends what is waiting now and resolves once nothing is left. */
  flush(): Promise<void>;
  /** The main bot id the server holds, once known (after a load). */
  noteServerMain(mainBotId: string | null): void;
}

interface QueueOptions {
  send: (payload: BotsPayload) => Promise<ApiResult>;
  /** Called after every request with its outcome. */
  onResult?: (result: ApiResult) => void;
  /** Called when the queue empties; true when every request succeeded. */
  onDrained?: (allSucceeded: boolean) => void;
  delayMs?: number;
}

/**
 * Coalesces writes to /api/bots and sends them one at a time, in order, so a
 * stale list never lands after a newer one (last write wins). A write that
 * would drop the main bot the server holds is kept as its own request, after
 * the one that moves the main role: the server refuses a list that drops its
 * current main bot, so "make B main, delete A" is two PUTs, never one.
 */
export function createBotsPutQueue(options: QueueOptions): BotsPutQueue {
  const { send, onResult, onDrained, delayMs = 300 } = options;
  const pending: BotsPayload[] = [];
  let inFlight: BotsPayload | null = null;
  let confirmedMain: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;
  let failed = false;

  // The main bot the server will hold just before the last pending request.
  function mainBeforeTail(): string | null {
    const before = pending.length >= 2 ? pending[pending.length - 2] : inFlight;
    return before?.mainBotId ?? confirmedMain;
  }

  async function drain(): Promise<void> {
    let sent = 0;
    while (pending.length > 0) {
      const payload = pending.shift()!;
      inFlight = payload;
      const result = await send(payload);
      inFlight = null;
      if (result.ok) {
        confirmedMain = result.state.mainBotId ?? payload.mainBotId;
      } else {
        failed = true;
      }
      sent += 1;
      onResult?.(result);
    }
    const allSucceeded = !failed;
    failed = false;
    if (sent > 0) onDrained?.(allSucceeded);
  }

  function schedule(): void {
    if (timer || running) return;
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, delayMs);
  }

  function run(): Promise<void> {
    running ??= drain().finally(() => {
      running = null;
      // A write that arrived as the loop ended still gets sent.
      if (pending.length > 0) schedule();
    });
    return running;
  }

  return {
    enqueue(payload) {
      const base = mainBeforeTail();
      const mergeable =
        pending.length > 0 &&
        (!base || payload.bots.some((bot) => bot.id === base));
      if (mergeable) pending[pending.length - 1] = payload;
      else pending.push(payload);
      schedule();
    },
    async flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      await run();
    },
    noteServerMain(mainBotId) {
      confirmedMain = mainBotId;
    },
  };
}
