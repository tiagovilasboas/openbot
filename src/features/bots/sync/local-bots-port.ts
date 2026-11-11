import {
  BOTS_STORAGE_KEY,
  DEFAULT_BOTS_LIST,
  loadActiveBotId,
  parseBots,
} from "../bot-storage.ts";
import { loadStoredMainBotId } from "../main-bot.ts";
import { buildPayload } from "./bots-load-decision.ts";
import type { BotsPayload, LocalSnapshot } from "./bots-sync-types.ts";

/** Set while this browser holds bot edits the server has not confirmed. */
export const UNSYNCED_STORAGE_KEY = "openbot_bots_unsynced";

/**
 * The bots saved in this browser; null when nothing is stored or the stored
 * list is broken or empty, so an untrusted list is never imported or used
 * to prune.
 */
export function readLocalSnapshot(storage: Storage): LocalSnapshot | null {
  try {
    const raw = storage.getItem(BOTS_STORAGE_KEY);
    if (!raw) return null;
    const bots = parseBots(raw);
    if (bots === DEFAULT_BOTS_LIST) return null;
    return {
      bots,
      activeBotId: loadActiveBotId(storage),
      storedMainBotId: loadStoredMainBotId(storage),
    };
  } catch {
    return null;
  }
}

/** The current local state, ready to send; null when there is none to send. */
export function readLocalPayload(storage: Storage): BotsPayload | null {
  const snapshot = readLocalSnapshot(storage);
  return snapshot
    ? buildPayload(
        snapshot.bots,
        snapshot.activeBotId,
        snapshot.storedMainBotId,
      )
    : null;
}

export function isUnsynced(storage: Storage): boolean {
  try {
    return storage.getItem(UNSYNCED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUnsynced(storage: Storage, value: boolean): void {
  try {
    if (value) storage.setItem(UNSYNCED_STORAGE_KEY, "1");
    else storage.removeItem(UNSYNCED_STORAGE_KEY);
  } catch {
    // Without storage the next load simply trusts the server.
  }
}
