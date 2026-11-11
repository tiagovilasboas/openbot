import { crewCopy } from "../crew/crew-copy.ts";
import { MAX_SYSTEM_PROMPT_CHARS } from "../model/system-prompt-limit.ts";
import { buildSkillsBlock } from "../skills/skill-prompt-block.ts";
import {
  buildBotSystemPrompt,
  buildBotSystemPromptWithin,
  describeBot,
} from "./bot-system-prompt.ts";
import type { BotProfile } from "./bot-types.ts";

type PromptLanguage = "pt" | "en";

/** What the built system prompt loses for a bot that is over its budget. */
export interface PromptBudgetReport {
  /** Characters the full prompt has beyond what fits. 0 when nothing is lost. */
  overBy: number;
  /** How many of the bot's skills are left out (0 when all fit). */
  skillsLeftOut: number;
  workspaceCut: boolean;
  descriptionCut: boolean;
}

/**
 * How many characters will follow the bot's own text in the prompt. The main
 * bot's team roster also follows it, but its size depends on the other bots,
 * so this counts only the fixed rule: a lower bound for the Chief. A
 * specialist may be run by the Chief, which adds the anti-loop rule.
 */
export function promptReserveFor(
  isMain: boolean,
  language: PromptLanguage,
): number {
  const copy = crewCopy[language];
  const rule = isMain ? copy.synthesisRule : copy.antiLoopRule;
  return rule.length + 2;
}

function countSkills(text: string): number {
  return text.split("[Skill ").length - 1;
}

/**
 * Compares the prompt the bot would send, built to the budget, against the
 * same prompt uncut, to say what is dropped. It reuses the one builder, so
 * the budget rules live only in bot-system-prompt.ts.
 */
export function analyzePromptBudget(
  bot: BotProfile,
  language: PromptLanguage,
  reserve = 0,
): PromptBudgetReport {
  const budget = Math.max(0, MAX_SYSTEM_PROMPT_CHARS - reserve);
  const full = buildBotSystemPromptWithin(bot, language, Infinity);
  const overBy = Math.max(0, full.length - budget);
  if (overBy === 0) {
    return {
      overBy: 0,
      skillsLeftOut: 0,
      workspaceCut: false,
      descriptionCut: false,
    };
  }
  const built = buildBotSystemPrompt(bot, language, reserve);
  const workspace = bot.workspaceContext ?? "";
  const skillsTotal = countSkills(buildSkillsBlock(bot.skills, language));
  return {
    overBy,
    skillsLeftOut: Math.max(0, skillsTotal - countSkills(built)),
    workspaceCut: workspace.length > 0 && !built.includes(workspace),
    descriptionCut: !built.includes(describeBot(bot, language)),
  };
}
