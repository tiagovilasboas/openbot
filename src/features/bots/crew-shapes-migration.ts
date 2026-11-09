import {
  BOTS_STORAGE_KEY,
  parseBots,
  saveBotsToStorage,
} from "./bot-storage.ts";
import type { AvatarShape, BotProfile } from "./bot-types.ts";

/*
 * Some crew members got new heads. Saved crews keep the shapes they were
 * stored with, so each round of new heads moves them once. A bot whose shape
 * the user already changed is left alone.
 */

/** Crew id → the old default shape and the new one. */
type CrewShapeChanges = Readonly<
  Record<string, { from: AvatarShape; to: AvatarShape }>
>;

/** Each round of new heads, with the key set once it has run. */
export const CREW_SHAPE_ROUNDS: readonly {
  key: string;
  changes: CrewShapeChanges;
}[] = [
  {
    key: "openbot_crew_shapes_v2",
    changes: {
      "chief-of-staff": { from: "hexagon", to: "ghost" },
      // The Inbox was stored as "diamond", which now loads as the ghost.
      inbox: { from: "ghost", to: "flower" },
      finance: { from: "pentagon", to: "clover" },
      product: { from: "egg", to: "dumpling" },
    },
  },
  {
    key: "openbot_crew_shapes_v3",
    changes: { security: { from: "octagon", to: "shield" } },
  },
];

/** The bots with every untouched crew shape moved to its new one. */
export function updateCrewShapes(
  bots: readonly BotProfile[],
  changes: CrewShapeChanges,
): BotProfile[] {
  return bots.map((bot) => {
    const change = changes[bot.id];
    return change && bot.avatarShape === change.from
      ? { ...bot, avatarShape: change.to }
      : bot;
  });
}

/** Runs every round not yet run; returns true when saved bots were rewritten. */
export function migrateCrewShapes(storage?: Storage): boolean {
  try {
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return false;
    const pending = CREW_SHAPE_ROUNDS.filter((r) => s.getItem(r.key) == null);
    if (pending.length === 0) return false;
    pending.forEach((r) => s.setItem(r.key, "1"));

    const raw = s.getItem(BOTS_STORAGE_KEY);
    if (raw == null) return false;
    const bots = parseBots(raw);
    const updated = pending.reduce(
      (list, r) => updateCrewShapes(list, r.changes),
      bots,
    );
    if (updated.every((bot, i) => bot === bots[i])) return false;
    saveBotsToStorage(updated, storage);
    return true;
  } catch {
    return false;
  }
}
