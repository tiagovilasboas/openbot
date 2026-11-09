import { sanitizeSkillList } from "../skills/skill-definition.ts";
import type { SkillDefinition } from "../skills/skill-types.ts";
import {
  BOTS_STORAGE_KEY,
  parseBots,
  saveBotsToStorage,
} from "./bot-storage.ts";
import { DEFAULT_BOT, type BotProfile } from "./bot-types.ts";

/*
 * Skills used to live in one global library, and each bot only kept the ids
 * it had switched on. Now every bot owns its skills. This moves the library
 * into the bots once, then deletes it, so no skill is lost on the way.
 */

/** Where the global skill library was stored. */
export const LEGACY_SKILLS_KEY = "openbot_custom_skills";

/**
 * Bots with their library ids resolved into their own copies. A skill that no
 * bot had switched on goes to the Chief of Staff (or the first bot).
 */
export function adoptLegacySkills(
  rawBots: string | null,
  library: readonly SkillDefinition[],
): BotProfile[] {
  const bots = parseBots(rawBots, library);
  const owned = new Set(bots.flatMap((bot) => bot.skills.map((s) => s.id)));
  const orphans = library.filter((skill) => !owned.has(skill.id));
  if (orphans.length === 0) return bots;

  const heir = bots.find((bot) => bot.id === DEFAULT_BOT.id) ?? bots[0];
  return bots.map((bot) =>
    bot === heir ? { ...bot, skills: [...bot.skills, ...orphans] } : bot,
  );
}

/** Runs the migration once; returns true when there was a library to move. */
export function migrateLegacySkills(storage?: Storage): boolean {
  try {
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    const raw = s?.getItem(LEGACY_SKILLS_KEY);
    if (!s || raw == null) return false;

    let library: SkillDefinition[] = [];
    try {
      library = sanitizeSkillList(JSON.parse(raw));
    } catch {
      // A corrupt library has nothing to move; it is still removed below.
    }
    if (library.length > 0) {
      const bots = adoptLegacySkills(s.getItem(BOTS_STORAGE_KEY), library);
      saveBotsToStorage(bots, storage);
    }
    s.removeItem(LEGACY_SKILLS_KEY);
    return true;
  } catch {
    return false;
  }
}
