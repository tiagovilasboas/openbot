/**
 * Replies a bot sent while the user was not looking at it, per bot id. A
 * count only grows by a reply and is cleared by opening the bot.
 */
export type AttentionCounts = Readonly<Record<string, number>>;

/** A bot never counts more than this; the number is a nudge, not a ledger. */
export const ATTENTION_MAX = 99;
/** Entries kept in storage; more than this cannot be bots of this app. */
export const ATTENTION_MAX_BOTS = 200;
const BOT_ID_MAX = 100;

/** A reply is unseen when another bot is open or the tab is out of view. */
export function shouldCountReply(
  botId: string,
  viewingBotId: string,
  tabVisible: boolean,
): boolean {
  return botId !== viewingBotId || !tabVisible;
}

export function addAttention(
  counts: AttentionCounts,
  botId: string,
): AttentionCounts {
  const next = Math.min((counts[botId] ?? 0) + 1, ATTENTION_MAX);
  return { ...counts, [botId]: next };
}

export function clearAttention(
  counts: AttentionCounts,
  botId: string,
): AttentionCounts {
  if (!(botId in counts)) return counts;
  return Object.fromEntries(
    Object.entries(counts).filter(([id]) => id !== botId),
  );
}

/** The sum over bots that still exist; a deleted bot no longer counts. */
export function totalAttention(
  counts: AttentionCounts,
  knownBotIds: readonly string[],
): number {
  return knownBotIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
}

/** Reads untrusted storage: keeps only sane ids with a count of 1..max. */
export function sanitizeAttention(raw: unknown): AttentionCounts {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const kept: Array<[string, number]> = [];
  for (const [id, value] of Object.entries(raw)) {
    if (kept.length >= ATTENTION_MAX_BOTS) break;
    if (id.length === 0 || id.length > BOT_ID_MAX) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const count = Math.min(Math.floor(value), ATTENTION_MAX);
    if (count >= 1) kept.push([id, count]);
  }
  return Object.fromEntries(kept);
}
