import { isValidBotId } from "./bot-id.ts";
import type { BotProfile } from "./bot-types.ts";

/**
 * The main bot is the one the user chose to lead the crew: it plays the
 * Chief of Staff, knows the other bots and cannot be deleted. Any bot can
 * become the main one; the role follows the choice, never a fixed id.
 */

const MAIN_BOT_STORAGE_KEY = "openbot_main_bot_id";
/** Before the choice existed, the stock Chief led; kept only as a fallback. */
const LEGACY_MAIN_IDS = ["chief-of-staff", "default"];

let listeners: Array<() => void> = [];

/** The main bot's id: the stored choice while it exists, else a fallback. */
export function resolveMainBotId(
  storedId: string | null,
  bots: Pick<BotProfile, "id">[],
): string | undefined {
  const ids = new Set(bots.map((bot) => bot.id));
  if (storedId && ids.has(storedId)) return storedId;
  return LEGACY_MAIN_IDS.find((id) => ids.has(id)) ?? bots[0]?.id;
}

/** The list with the main bot on top; the others keep their order. */
export function mainBotFirst<T extends Pick<BotProfile, "id">>(
  bots: T[],
  mainBotId: string | undefined,
): T[] {
  const main = bots.find((bot) => bot.id === mainBotId);
  if (!main || bots[0] === main) return bots;
  return [main, ...bots.filter((bot) => bot !== main)];
}

function browserStorage(): Storage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

export function loadStoredMainBotId(storage = browserStorage()): string | null {
  try {
    const stored = storage?.getItem(MAIN_BOT_STORAGE_KEY);
    return isValidBotId(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function saveMainBotId(id: string, storage = browserStorage()): void {
  try {
    storage?.setItem(MAIN_BOT_STORAGE_KEY, id);
    listeners.forEach((listener) => listener());
  } catch {
    // Storage can be blocked; the fallback keeps a main bot anyway.
  }
}

export function subscribeMainBotId(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
