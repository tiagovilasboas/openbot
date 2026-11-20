import type { Language } from "../language/language.ts";
import type { BotProfile } from "./bot-types.ts";
import { getStartersCopy } from "./bot-starters-copy.ts";

/** How many starter tasks the welcome offers. */
export const STARTERS_COUNT = 3;

/** A starter: a short chip label and the full task it puts in the composer. */
export type Starter = { label: string; task: string };

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
): Starter[] {
  const copy = getStartersCopy(language);
  const role = bot.title?.trim();
  const skill = bot.skills[0]?.name.trim();
  const starters: Starter[] = [
    { label: copy.introduceLabel, task: copy.introduce },
    role
      ? { label: copy.roleLabel, task: fill(copy.roleTask, { role }) }
      : { label: copy.fallbackLabel, task: copy.fallbackTask },
    skill
      ? {
          label: fill(copy.skillLabel, { skill }),
          task: fill(copy.skillTask, { skill }),
        }
      : { label: copy.planLabel, task: copy.planTask },
  ];
  return starters.slice(0, STARTERS_COUNT);
}
