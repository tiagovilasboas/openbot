import {
  BOTS_STORAGE_KEY,
  parseBots,
  saveBotsToStorage,
} from "./bot-storage.ts";
import type { AvatarShape, BotProfile } from "./bot-types.ts";

/*
 * Some crew members got new heads. Saved crews keep the shapes they were
 * stored with, so this moves them once. A bot whose shape the user already
 * changed is left alone.
 */

/** Set once the saved crew has been moved to the new shapes. */
export const CREW_SHAPES_KEY = "openbot_crew_shapes_v2";

/** Crew id → the old default shape and the new one. */
const NEW_CREW_SHAPES: Readonly<
  Record<string, { from: AvatarShape; to: AvatarShape }>
> = {
  "chief-of-staff": { from: "hexagon", to: "ghost" },
  // The Inbox was stored as "diamond", which now loads as the ghost.
  inbox: { from: "ghost", to: "flower" },
  finance: { from: "pentagon", to: "clover" },
  product: { from: "egg", to: "dumpling" },
};

/** The bots with every untouched crew shape moved to its new one. */
export function updateCrewShapes(bots: readonly BotProfile[]): BotProfile[] {
  return bots.map((bot) => {
    const change = NEW_CREW_SHAPES[bot.id];
    return change && bot.avatarShape === change.from
      ? { ...bot, avatarShape: change.to }
      : bot;
  });
}

/** Runs the migration once; returns true when saved bots were rewritten. */
export function migrateCrewShapes(storage?: Storage): boolean {
  try {
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s || s.getItem(CREW_SHAPES_KEY) != null) return false;
    s.setItem(CREW_SHAPES_KEY, "1");

    const raw = s.getItem(BOTS_STORAGE_KEY);
    if (raw == null) return false;
    const bots = parseBots(raw);
    const updated = updateCrewShapes(bots);
    if (updated.every((bot, i) => bot === bots[i])) return false;
    saveBotsToStorage(updated, storage);
    return true;
  } catch {
    return false;
  }
}
