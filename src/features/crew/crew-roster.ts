import type { BotProfile } from "../bots/bot-types.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { crewCopy } from "./crew-copy.ts";

const MAX_ROLE_LENGTH = 140;

/** The handle a bot answers to; matches how @mentions resolve names. */
export function crewHandle(bot: Pick<BotProfile, "name">): string {
  return `@${bot.name.replace(/\s+/g, "")}`;
}

/**
 * One line describing what a bot does, taken from its description. The
 * "You are X." opener carries no role, so it is dropped when more follows.
 */
export function crewRole(bot: Pick<BotProfile, "description">): string {
  const sentences = bot.description
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const opener = /^(você é|voce é|you are)\s/i;
  const meaningful =
    sentences.length > 1 && opener.test(sentences[0] ?? "")
      ? sentences.slice(1)
      : sentences;
  const role = meaningful[0] ?? "";
  return role.length > MAX_ROLE_LENGTH
    ? `${role.slice(0, MAX_ROLE_LENGTH - 1).trimEnd()}…`
    : role;
}

/**
 * The roster appended to the Chief's system prompt: every other bot with its
 * handle, role and skill names, then how to delegate to them. Empty when
 * the Chief works alone.
 */
export function buildCrewRoster(
  chief: Pick<BotProfile, "id">,
  bots: BotProfile[],
  language: ChatLanguage,
): string {
  const copy = crewCopy[language];
  const crew = bots.filter((bot) => bot.id !== chief.id);
  if (crew.length === 0) return "";

  const lines = crew.map((bot) => {
    const role = crewRole(bot);
    const title = bot.title ? ` (${bot.title})` : "";
    const skills = bot.skills.length
      ? bot.skills.map((skill) => skill.name).join(", ")
      : copy.noSkills;
    return `- ${bot.name} ${crewHandle(bot)}${title}: ${role} [skills: ${skills}]`;
  });
  return `${copy.rosterHeader}\n${lines.join("\n")}\n\n${copy.delegationRules(crew[0]?.name ?? "")}`;
}
