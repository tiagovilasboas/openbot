import {
  BOTS_STORAGE_KEY,
  DEFAULT_BOTS_LIST,
  parseBots,
} from "./bot-storage.ts";
import { DEFAULT_BOT } from "./bot-types.ts";
import { CREW_PRESETS } from "./crew-presets.ts";

/**
 * The ids that must keep their data: every bot in the stored list, plus the
 * crew presets and the default bot. Null when the list cannot be trusted
 * (nothing stored, broken, or empty), so nothing may be pruned from it.
 */
export function protectedBotIdsFromStorage(
  storage?: Pick<Storage, "getItem">,
): Set<string> | null {
  try {
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    const raw = s?.getItem(BOTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parseBots(raw) === DEFAULT_BOTS_LIST) {
      return null;
    }
    const ids = new Set<string>([
      DEFAULT_BOT.id,
      ...CREW_PRESETS.map((bot) => bot.id),
    ]);
    // Entries the sanitizer would drop keep their data too: when in doubt, keep.
    for (const entry of parsed) {
      const id = (entry as { id?: unknown } | null)?.id;
      if (typeof id === "string") ids.add(id);
    }
    return ids;
  } catch {
    return null;
  }
}
