import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";

const SLASH_QUERY = /^\/\S*$/;
const MENTION_QUERY = /(?:^|\s)@([a-zA-Z0-9_-]*)$/;
const LEADING_COMMAND = /^\/\S*\s*/;

/** The skill filter while the draft is a bare `/command` being typed. */
export function parseSlashQuery(draft: string): string | null {
  return SLASH_QUERY.test(draft) ? draft.slice(1) : null;
}

/** The bot filter while the draft ends in an `@name` being typed. */
export function parseMentionQuery(draft: string): string | null {
  const match = draft.match(MENTION_QUERY);
  return match ? (match[1] ?? "") : null;
}

export function filterSkills(
  skills: readonly SkillDefinition[],
  query: string,
): SkillDefinition[] {
  const normalized = query.toLowerCase().replace(/^\/+/, "");
  return skills.filter(
    (skill) =>
      skill.command.toLowerCase().includes(normalized) ||
      skill.name.toLowerCase().includes(normalized) ||
      skill.description.toLowerCase().includes(normalized),
  );
}

export function filterBots(
  bots: readonly BotProfile[],
  query: string,
): BotProfile[] {
  const normalized = query.toLowerCase().replace(/^@+/, "").trim();
  if (!normalized) return [...bots];
  return bots.filter(
    (bot) =>
      bot.name.toLowerCase().includes(normalized) ||
      Boolean(bot.title?.toLowerCase().includes(normalized)) ||
      bot.id.toLowerCase().includes(normalized),
  );
}

/** Puts the skill command first, replacing a command already typed. */
export function applySkillCommand(
  draft: string,
  skill: SkillDefinition,
): string {
  const rest = draft.startsWith("/")
    ? draft.replace(LEADING_COMMAND, "")
    : draft.trimStart();
  return rest ? `${skill.command} ${rest}` : `${skill.command} `;
}

/** Completes the `@name` being typed, or appends a mention to the draft. */
export function applyBotMention(draft: string, bot: BotProfile): string {
  if (parseMentionQuery(draft) !== null) {
    const atIndex = draft.lastIndexOf("@");
    return `${draft.slice(0, atIndex)}@${bot.name} `;
  }
  const text = draft.trim();
  return text ? `${text} @${bot.name} ` : `@${bot.name} `;
}
