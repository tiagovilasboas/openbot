import type { BotProfile } from "./bot-types.ts";

/** Bots shown in the main list and in mention palettes. */
export function visibleBots(bots: readonly BotProfile[]): BotProfile[] {
  return bots.filter((bot) => !bot.hidden);
}

/** Bots tucked into the collapsed "Hidden" group. */
export function hiddenBots(bots: readonly BotProfile[]): BotProfile[] {
  return bots.filter((bot) => bot.hidden === true);
}

/**
 * A bot can be hidden unless it leads the crew, is already hidden, or is the
 * last visible one (the list must never end up with nobody to talk to).
 */
export function canHideBot(
  bots: readonly BotProfile[],
  id: string,
  mainBotId?: string,
): boolean {
  if (id === mainBotId) return false;
  const bot = bots.find((b) => b.id === id);
  if (!bot || bot.hidden) return false;
  return visibleBots(bots).some((other) => other.id !== id);
}

/** The list with one bot hidden or restored; `hidden` is dropped on restore. */
export function setBotHidden(
  bots: readonly BotProfile[],
  id: string,
  hidden: boolean,
): BotProfile[] {
  return bots.map((bot) => {
    if (bot.id !== id) return bot;
    const { hidden: _previous, ...rest } = bot;
    return hidden ? { ...rest, hidden: true } : rest;
  });
}
