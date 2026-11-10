import type { TokenUsage } from "../model/token-usage.ts";
import { lastDays, type UsageDay } from "./usage-day.ts";

/** Most days kept per bot; older days are dropped when a call is added. */
export const USAGE_MAX_DAYS = 90;
/** Ceiling for every stored counter, so hostile storage cannot overflow math. */
export const USAGE_MAX_COUNT = 1_000_000_000_000;

/**
 * What one bot used on one local day. `calls` counts every reply that
 * finished; `callsWithoutUsage` is the part the provider gave no counts for.
 * Those are never estimated: the tokens simply are not in the sums.
 */
export interface UsageRecord {
  botId: string;
  day: UsageDay;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  callsWithoutUsage: number;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  calls: number;
  callsWithoutUsage: number;
}

const NO_TOTALS: UsageTotals = {
  inputTokens: 0,
  outputTokens: 0,
  calls: 0,
  callsWithoutUsage: 0,
};

export function capCount(value: number): number {
  return Math.min(value, USAGE_MAX_COUNT);
}

/** Keeps the newest days of each bot. Input order does not matter. */
export function capDaysPerBot(records: readonly UsageRecord[]): UsageRecord[] {
  const newestFirst = [...records].sort((a, b) =>
    a.day < b.day ? 1 : a.day > b.day ? -1 : 0,
  );
  const kept = new Map<string, number>();
  return newestFirst.filter((record) => {
    const count = (kept.get(record.botId) ?? 0) + 1;
    kept.set(record.botId, count);
    return count <= USAGE_MAX_DAYS;
  });
}

/**
 * Adds one finished reply to the bot's record for `day`. `usage` is what the
 * provider reported; undefined means it reported nothing, and the call is
 * counted as a call without data.
 */
export function addCall(
  records: readonly UsageRecord[],
  botId: string,
  usage: TokenUsage | undefined,
  day: UsageDay,
): UsageRecord[] {
  const known =
    usage !== undefined &&
    (usage.inputTokens !== undefined || usage.outputTokens !== undefined);
  const current = records.find((r) => r.botId === botId && r.day === day);
  const next: UsageRecord = {
    botId,
    day,
    inputTokens: capCount(
      (current?.inputTokens ?? 0) + (usage?.inputTokens ?? 0),
    ),
    outputTokens: capCount(
      (current?.outputTokens ?? 0) + (usage?.outputTokens ?? 0),
    ),
    calls: capCount((current?.calls ?? 0) + 1),
    callsWithoutUsage: capCount(
      (current?.callsWithoutUsage ?? 0) + (known ? 0 : 1),
    ),
  };
  const others = records.filter((r) => r !== current);
  return capDaysPerBot([...others, next]);
}

function sum(records: readonly UsageRecord[]): UsageTotals {
  return records.reduce<UsageTotals>(
    (total, r) => ({
      inputTokens: capCount(total.inputTokens + r.inputTokens),
      outputTokens: capCount(total.outputTokens + r.outputTokens),
      calls: capCount(total.calls + r.calls),
      callsWithoutUsage: capCount(
        total.callsWithoutUsage + r.callsWithoutUsage,
      ),
    }),
    NO_TOTALS,
  );
}

/** Everything kept for the bot. */
export function totalForBot(
  records: readonly UsageRecord[],
  botId: string,
): UsageTotals {
  return sum(records.filter((r) => r.botId === botId));
}

/** The bot's usage over the 7 local days ending at `today`, today included. */
export function lastSevenDays(
  records: readonly UsageRecord[],
  botId: string,
  today: UsageDay,
): UsageTotals {
  const window = new Set(lastDays(today, 7));
  return sum(records.filter((r) => r.botId === botId && window.has(r.day)));
}

export function clearBot(
  records: readonly UsageRecord[],
  botId: string,
): UsageRecord[] {
  return records.filter((r) => r.botId !== botId);
}
