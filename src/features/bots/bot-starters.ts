import type { Language } from "../language/language.ts";
import type { BotProfile } from "./bot-types.ts";
import { getStartersCopy } from "./bot-starters-copy.ts";

/** How many starter tasks the welcome offers. */
export const STARTERS_COUNT = 3;

const fill = (template: string, values: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

/**
 * Three starter tasks for an empty conversation, derived from the bot's
 * profile only: its role (title), then its first skill, then fixed tasks.
 * Deterministic and offline; no model is called.
 */
export function botStarters(
  bot: Pick<BotProfile, "title" | "skills">,
  language: Language,
): string[] {
  const copy = getStartersCopy(language);
  const role = bot.title?.trim();
  const skill = bot.skills[0]?.name.trim();
  const tasks = [
    copy.introduce,
    role ? fill(copy.roleTask, { role }) : copy.fallbackTask,
    skill ? fill(copy.skillTask, { skill }) : copy.planTask,
  ];
  return tasks.slice(0, STARTERS_COUNT);
}
