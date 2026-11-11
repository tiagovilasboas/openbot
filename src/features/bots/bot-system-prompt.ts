import type { Language } from "../language/language.ts";
import { MAX_SYSTEM_PROMPT_CHARS } from "../model/system-prompt-limit.ts";
import { buildSkillsBlock } from "../skills/skill-prompt-block.ts";
import type { BotProfile } from "./bot-types.ts";

type PromptLanguage = Language;

/** The stock Chief's description per language; Portuguese is what is stored. */
const CHIEF_DESCRIPTION: Record<Language, string | null> = {
  pt: null,
  en: "You are the Chief of Staff, the general coordinator of the bot team. Your role is to plan, synthesize repository/calendar information, and coordinate/delegate tasks to specialist bots when needed.",
  es: "Eres el Chief of Staff, el coordinador general del equipo de bots. Tu función es planificar, sintetizar información de repositorios y calendario, y coordinar o delegar tareas a los bots especialistas cuando haga falta.",
};

const WORKSPACE_LABEL: Record<Language, string> = {
  pt: "Contexto de Workspace:",
  en: "Workspace Context:",
  es: "Contexto del workspace:",
};

export function describeBot(bot: BotProfile, language: PromptLanguage): string {
  const isStockChief =
    (bot.id === "chief-of-staff" || bot.id === "default") &&
    bot.description.includes("Você é o Chief of Staff");
  return (isStockChief && CHIEF_DESCRIPTION[language]) || bot.description;
}

const CUT_MARK = "…";

function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  return max <= 0 ? "" : `${text.slice(0, Math.max(0, max - 1))}${CUT_MARK}`;
}

/**
 * A bot's own system prompt: its description, workspace context and skills.
 * `reserve` is how many characters the caller will add after it (the team
 * roster, the delegation or synthesis rule), which must never be cut off, so
 * the bot's part is built to leave that room. When it does not fit, the skills
 * go first (whole skills, never half a delimiter), then the workspace context,
 * and the description last.
 */
export function buildBotSystemPrompt(
  bot: BotProfile,
  language: PromptLanguage,
  reserve = 0,
): string {
  return buildBotSystemPromptWithin(
    bot,
    language,
    Math.max(0, MAX_SYSTEM_PROMPT_CHARS - reserve),
  );
}

/**
 * The same prompt built to an explicit character budget. An infinite budget
 * gives the whole prompt, uncut, which is what the editor measures against.
 */
export function buildBotSystemPromptWithin(
  bot: BotProfile,
  language: PromptLanguage,
  budget: number,
): string {
  const description = describeBot(bot, language);
  const workspaceLabel = WORKSPACE_LABEL[language];
  const workspaceText = bot.workspaceContext ?? "";
  const workspaceOf = (text: string) =>
    text ? `\n\n${workspaceLabel}\n${text}` : "";

  if (description.length >= budget) return cut(description, budget);
  const workspaceRoom = budget - description.length - workspaceLabel.length - 3;
  const workspace = workspaceOf(
    workspaceText && workspaceRoom > 0 ? cut(workspaceText, workspaceRoom) : "",
  );
  const skillsRoom = budget - description.length - workspace.length - 2;
  const skills =
    skillsRoom > 0 ? buildSkillsBlock(bot.skills, language, skillsRoom) : "";
  return skills
    ? `${description}${workspace}\n\n${skills}`
    : `${description}${workspace}`;
}
