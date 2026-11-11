import type { BotProfile } from "../bot-types.ts";
import { resolveMainBotId } from "../main-bot.ts";

// The client never deletes the main bot (deleteBotFromList refuses it), and
// the main bot is resolved by resolveMainBotId. The server applies the same
// rule: a write may not drop the main bot the store currently has.
export function dropsMainBot(
  current: readonly Pick<BotProfile, "id">[],
  storedMainBotId: string | null,
  next: readonly Pick<BotProfile, "id">[],
): boolean {
  const mainId = resolveMainBotId(storedMainBotId, [...current]);
  if (!mainId) return false;
  return !next.some((bot) => bot.id === mainId);
}
