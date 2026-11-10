import { mainBotFirst } from "./main-bot.ts";
import type { BotProfile } from "./bot-types.ts";

type Ordered = Pick<BotProfile, "id">;

/**
 * The list after moving one bot to `toIndex`, counted in the list as shown
 * (main bot on top). The main bot never moves and nothing goes above it, so
 * the result is always main-first. An unknown id, the main bot itself or a
 * move that changes nothing returns the very same array.
 */
export function reorderBots<T extends Ordered>(
  list: T[],
  id: string,
  toIndex: number,
  mainBotId: string | undefined,
): T[] {
  const shown = mainBotFirst(list, mainBotId);
  const from = shown.findIndex((bot) => bot.id === id);
  if (from === -1 || id === mainBotId) return list;

  const hasMain = shown.some((bot) => bot.id === mainBotId);
  const lowest = hasMain ? 1 : 0;
  const target = Math.min(
    Math.max(Math.trunc(toIndex), lowest),
    shown.length - 1,
  );
  if (!Number.isFinite(target) || target === from) return shown;

  const next = [...shown];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved!);
  return next;
}

/**
 * Where a dragged row lands: how many of the other rows have their centre
 * above the pointer. `centres` are the other rows' vertical centres in order.
 */
export function dropIndexAt(centres: readonly number[], pointerY: number) {
  return centres.filter((centre) => centre < pointerY).length;
}
