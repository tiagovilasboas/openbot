import { isValidBotId } from "../bots/bot-id.ts";
import { isUsageDay } from "./usage-day.ts";
import { capCount, capDaysPerBot, type UsageRecord } from "./usage-record.ts";

/** Hard stop for hostile storage: more bots than anyone keeps. */
const MAX_BOTS = 100;
/** A whole, non-negative count under the ceiling; anything else is 0. */
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return capCount(Math.floor(value));
}

function sanitizeRecord(value: unknown): UsageRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (!isValidBotId(raw.botId) || !isUsageDay(raw.day)) return null;
  const calls = count(raw.calls);
  return {
    botId: raw.botId,
    day: raw.day,
    inputTokens: count(raw.inputTokens),
    outputTokens: count(raw.outputTokens),
    calls,
    // Cannot exceed the calls they belong to.
    callsWithoutUsage: Math.min(count(raw.callsWithoutUsage), calls),
  };
}

/**
 * Everything read back from storage goes through here. Bad entries are
 * dropped, counters are clamped, a repeated bot and day is merged, and the
 * days kept per bot and the number of bots are capped.
 */
export function sanitizeUsage(value: unknown): UsageRecord[] {
  if (!Array.isArray(value)) return [];
  const merged = new Map<string, UsageRecord>();
  const bots = new Set<string>();
  for (const item of value) {
    const record = sanitizeRecord(item);
    if (!record) continue;
    if (!bots.has(record.botId)) {
      if (bots.size >= MAX_BOTS) continue;
      bots.add(record.botId);
    }
    // JSON.stringify keeps the key unambiguous for any bot id.
    const key = JSON.stringify([record.botId, record.day]);
    const previous = merged.get(key);
    merged.set(
      key,
      previous
        ? {
            ...record,
            inputTokens: capCount(previous.inputTokens + record.inputTokens),
            outputTokens: capCount(previous.outputTokens + record.outputTokens),
            calls: capCount(previous.calls + record.calls),
            callsWithoutUsage: Math.min(
              capCount(previous.callsWithoutUsage + record.callsWithoutUsage),
              capCount(previous.calls + record.calls),
            ),
          }
        : record,
    );
  }
  return capDaysPerBot([...merged.values()]);
}
