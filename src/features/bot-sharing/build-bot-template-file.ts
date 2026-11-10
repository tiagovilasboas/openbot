import type { BotProfile } from "../bots/bot-types.ts";
import {
  TEMPLATE_FILE_APP,
  TEMPLATE_FILE_KIND,
  TEMPLATE_FILE_VERSION,
  type BotTemplateFile,
} from "./bot-template-file-types.ts";

/**
 * Builds the shareable file for one bot. It lists the allowed fields one by
 * one, so an id, a date, a conversation or a secret cannot slip in later.
 */
export function buildBotTemplateFile(
  bot: BotProfile,
  now: Date = new Date(),
): BotTemplateFile {
  return {
    app: TEMPLATE_FILE_APP,
    kind: TEMPLATE_FILE_KIND,
    version: TEMPLATE_FILE_VERSION,
    exportedAt: now.toISOString(),
    bot: {
      name: bot.name,
      ...(bot.title ? { title: bot.title } : {}),
      description: bot.description,
      ...(bot.workspaceContext
        ? { workspaceContext: bot.workspaceContext }
        : {}),
      avatarShape: bot.avatarShape,
      avatarColor: bot.avatarColor,
      skills: bot.skills.map((skill) => ({
        name: skill.name,
        command: skill.command,
        description: skill.description,
        instructions: skill.instructions,
      })),
    },
  };
}

/** A file name that is safe on every system, from the bot's name. */
export function botTemplateFileName(botName: string): string {
  const slug = botName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `openbot-bot-${slug || "template"}.json`;
}
