import type { BotProfile } from "./bot-types.ts";

type PromptLanguage = "pt" | "en";

const CHIEF_EN_DESCRIPTION =
  "You are the Chief of Staff, the general coordinator of the bot team. Your role is to plan, synthesize repository/calendar information, and coordinate/delegate tasks to specialist bots when needed.";

function describeBot(bot: BotProfile, language: PromptLanguage): string {
  const isStockChief =
    (bot.id === "chief-of-staff" || bot.id === "default") &&
    bot.description.includes("Você é o Chief of Staff");
  return isStockChief && language === "en"
    ? CHIEF_EN_DESCRIPTION
    : bot.description;
}

/** A bot's own system prompt: its description, workspace context and skills. */
export function buildBotSystemPrompt(
  bot: BotProfile,
  language: PromptLanguage,
): string {
  const isPt = language === "pt";
  const description = describeBot(bot, language);
  const workspace = bot.workspaceContext
    ? `\n\n${isPt ? "Contexto de Workspace:" : "Workspace Context:"}\n${bot.workspaceContext}`
    : "";
  const skills = bot.skills
    .map((s) => `[Skill ${s.name} (${s.command})]: ${s.instructions}`)
    .join("\n");
  return skills
    ? `${description}${workspace}\n\n${isPt ? "Skills Habilitadas:" : "Enabled Skills:"}\n${skills}`
    : `${description}${workspace}`;
}
