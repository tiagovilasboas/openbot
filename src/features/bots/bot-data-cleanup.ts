import {
  forgetBotAttention,
  storedAttentionBotIds,
} from "../attention/attention-storage.ts";
import {
  forgetBotMessages,
  storedMessageBotIds,
} from "../chat/use-bot-messages.ts";
import {
  deleteBotMemory,
  storedMemoryBotIds,
} from "../memory/memory-storage.ts";
import { clearBotUsage, storedUsageBotIds } from "../usage/usage-storage.ts";
import { protectedBotIdsFromStorage } from "./protected-bot-ids.ts";

/** One domain's per-bot data: which bots it holds data for, and how to drop it. */
export interface BotDataStore {
  botIds(): string[];
  forget(botId: string): void;
}

/** Every domain that keeps data per bot, each cleaned by its own function. */
export const BOT_DATA_STORES: readonly BotDataStore[] = [
  { botIds: storedMessageBotIds, forget: (id) => forgetBotMessages(id) },
  { botIds: storedMemoryBotIds, forget: (id) => deleteBotMemory(id) },
  { botIds: storedUsageBotIds, forget: (id) => clearBotUsage(id) },
  { botIds: storedAttentionBotIds, forget: (id) => forgetBotAttention(id) },
];

/** Drops a deleted bot's data in every domain. */
export function forgetBotData(
  botId: string,
  stores: readonly BotDataStore[] = BOT_DATA_STORES,
): void {
  for (const store of stores) {
    try {
      store.forget(botId);
    } catch {
      // One blocked domain must not leave the others behind.
    }
  }
}

/**
 * Cleans data of bots that no longer exist, for people who deleted bots
 * before deletion cleaned up. Does nothing unless the stored bot list is
 * present, valid and non-empty; presets and the default bot are never pruned.
 * Returns the ids it pruned.
 */
export function pruneOrphanBotData(
  protectedIds: ReadonlySet<string> | null = protectedBotIdsFromStorage(),
  stores: readonly BotDataStore[] = BOT_DATA_STORES,
): string[] {
  if (!protectedIds || protectedIds.size === 0) return [];
  const pruned = new Set<string>();
  for (const store of stores) {
    try {
      for (const id of store.botIds()) {
        if (protectedIds.has(id)) continue;
        store.forget(id);
        pruned.add(id);
      }
    } catch {
      // Best effort: the next load tries again.
    }
  }
  return [...pruned];
}
