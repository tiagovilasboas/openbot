import type { BotProfile } from "./bot-types.ts";
import { visibleBots } from "./bot-visibility.ts";

/** Longest folder name: it is a sidebar heading, not a description. */
export const BOT_FOLDER_MAX_LENGTH = 30;

/** A folder name as stored: one trimmed line, or undefined for none. */
export function cleanFolder(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const line = value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, BOT_FOLDER_MAX_LENGTH);
  return line || undefined;
}

export type SidebarGroups = {
  /** Bots in no folder; the main bot is always here, on top. */
  loose: BotProfile[];
  folders: { name: string; bots: BotProfile[] }[];
};

/**
 * The visible bots as the sidebar groups them: loose bots in list order,
 * then each folder (by name), its bots in list order.
 */
export function groupByFolder(
  bots: readonly BotProfile[],
  mainBotId?: string,
): SidebarGroups {
  const loose: BotProfile[] = [];
  const byName = new Map<string, BotProfile[]>();
  for (const bot of visibleBots(bots)) {
    const folder = bot.id === mainBotId ? undefined : cleanFolder(bot.folder);
    if (!folder) {
      loose.push(bot);
      continue;
    }
    const group = byName.get(folder) ?? [];
    group.push(bot);
    byName.set(folder, group);
  }
  const folders = [...byName.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, list]) => ({ name, bots: list }));
  return { loose, folders };
}

/** The visible bots in the order the sidebar shows them. */
export function sidebarOrder(
  bots: readonly BotProfile[],
  mainBotId?: string,
): BotProfile[] {
  const { loose, folders } = groupByFolder(bots, mainBotId);
  return [...loose, ...folders.flatMap((f) => f.bots)];
}

/** The list with one bot moved into a folder, or out of it with "". */
export function setBotFolder(
  bots: readonly BotProfile[],
  id: string,
  folder: string,
): BotProfile[] {
  const name = cleanFolder(folder);
  return bots.map((bot) => {
    if (bot.id !== id) return bot;
    const { folder: _previous, ...rest } = bot;
    return name ? { ...rest, folder: name } : rest;
  });
}
