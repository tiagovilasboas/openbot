import { isNearDuplicate } from "./text-similarity.ts";

/** One turn of a multi-bot exchange. */
export type LoopTurn =
  | { kind: "human"; text: string }
  | { kind: "bot"; botId: string; text: string };

export type LoopGuardOptions = {
  /** Bot turns allowed in a row without a human message. */
  maxRounds: number;
  /** How many earlier bot turns a new bot reply is compared with. */
  echoWindow: number;
  /** Token Jaccard at or above which two replies count as an echo. */
  echoThreshold: number;
  /** Lower threshold used to call an A-B-A-B exchange "no new content". */
  pingPongThreshold: number;
};

export const DEFAULT_LOOP_GUARD_OPTIONS: LoopGuardOptions = {
  maxRounds: 8,
  echoWindow: 6,
  echoThreshold: 0.85,
  pingPongThreshold: 0.6,
};

export type LoopStopReason =
  | { reason: "max_rounds"; rounds: number; limit: number }
  | { reason: "echo"; botId: string; repeatedBotId: string }
  | { reason: "ping_pong"; botIds: [string, string] };

export type LoopVerdict =
  { allowed: true } | ({ allowed: false } & LoopStopReason);

type BotTurn = Extract<LoopTurn, { kind: "bot" }>;

/** Bot turns after the last human message (a human message resets the run). */
function botRun(turns: readonly LoopTurn[]): BotTurn[] {
  const run: BotTurn[] = [];
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i];
    if (turn.kind === "human") break;
    run.unshift(turn);
  }
  return run;
}

function findEcho(
  run: readonly BotTurn[],
  options: LoopGuardOptions,
): LoopStopReason | null {
  if (run.length < 2) return null;
  const last = run[run.length - 1];
  const earlier = run.slice(-1 - options.echoWindow, -1);
  for (const turn of earlier) {
    if (isNearDuplicate(last.text, turn.text, options.echoThreshold)) {
      return { reason: "echo", botId: last.botId, repeatedBotId: turn.botId };
    }
  }
  return null;
}

/** A-B-A-B with each bot mostly repeating its own previous turn. */
function findPingPong(
  run: readonly BotTurn[],
  options: LoopGuardOptions,
): LoopStopReason | null {
  if (run.length < 4) return null;
  const [a1, b1, a2, b2] = run.slice(-4);
  if (a1.botId === b1.botId) return null;
  if (a2.botId !== a1.botId || b2.botId !== b1.botId) return null;
  const stale =
    isNearDuplicate(a1.text, a2.text, options.pingPongThreshold) &&
    isNearDuplicate(b1.text, b2.text, options.pingPongThreshold);
  return stale ? { reason: "ping_pong", botIds: [a1.botId, b1.botId] } : null;
}

/**
 * Decide whether the exchange may continue after `turns`. Echo and ping-pong
 * are checked before the round cap because they name a more specific cause.
 */
export function checkLoopGuard(
  turns: readonly LoopTurn[],
  overrides: Partial<LoopGuardOptions> = {},
): LoopVerdict {
  const options = { ...DEFAULT_LOOP_GUARD_OPTIONS, ...overrides };
  const run = botRun(turns);
  const stop =
    findEcho(run, options) ??
    findPingPong(run, options) ??
    (run.length >= options.maxRounds
      ? ({
          reason: "max_rounds",
          rounds: run.length,
          limit: options.maxRounds,
        } as const)
      : null);
  return stop ? { allowed: false, ...stop } : { allowed: true };
}
