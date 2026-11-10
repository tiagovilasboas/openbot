import { sanitizeBotProfile } from "../bots/bot-storage.ts";
import { createCustomSkill } from "../skills/skill-definition.ts";
import type { SkillDefinition } from "../skills/skill-types.ts";
import {
  TEMPLATE_FILE_APP,
  TEMPLATE_FILE_KIND,
  TEMPLATE_FILE_MAX_BYTES,
  TEMPLATE_FILE_VERSION,
  TEMPLATE_MAX_SKILLS,
  type BotTemplateDraft,
  type ParseBotTemplateResult,
} from "./bot-template-file-types.ts";

const MAX_TEXT_LENGTH = 20_000;
const MAX_LABEL_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readSkills(raw: unknown): SkillDefinition[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > TEMPLATE_MAX_SKILLS) return null;
  const skills: SkillDefinition[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const name = text(entry.name, MAX_LABEL_LENGTH);
    if (!name) continue;
    skills.push(
      createCustomSkill({
        name,
        command: text(entry.command, MAX_LABEL_LENGTH),
        description: text(entry.description, MAX_TEXT_LENGTH),
        instructions: text(entry.instructions, MAX_TEXT_LENGTH),
        source: "imported",
      }),
    );
  }
  return skills;
}

function readBot(raw: unknown): BotTemplateDraft | null {
  if (!isRecord(raw)) return null;
  const description = text(raw.description, MAX_TEXT_LENGTH);
  if (!description) return null;
  const skills = readSkills(raw.skills);
  if (!skills) return null;
  // The bot sanitizer clamps the name and checks the avatar's shape and color.
  const bot = sanitizeBotProfile({
    id: "template",
    name: raw.name,
    title: text(raw.title, MAX_LABEL_LENGTH) || undefined,
    description,
    workspaceContext: text(raw.workspaceContext, MAX_TEXT_LENGTH) || undefined,
    avatarShape: raw.avatarShape,
    avatarColor: raw.avatarColor,
  });
  if (!bot) return null;
  return {
    name: bot.name,
    ...(bot.title ? { title: bot.title } : {}),
    description: bot.description,
    ...(bot.workspaceContext ? { workspaceContext: bot.workspaceContext } : {}),
    avatarShape: bot.avatarShape,
    avatarColor: bot.avatarColor,
    skills,
  };
}

/** Validates a template file's text. Nothing in it is trusted. */
export function parseBotTemplateFile(input: unknown): ParseBotTemplateResult {
  if (typeof input !== "string") return { ok: false, error: "invalid_file" };
  if (input.length > TEMPLATE_FILE_MAX_BYTES) {
    return { ok: false, error: "too_large" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, error: "invalid_file" };
  }
  if (!isRecord(parsed) || parsed.app !== TEMPLATE_FILE_APP) {
    return { ok: false, error: "invalid_file" };
  }
  if (parsed.kind !== TEMPLATE_FILE_KIND) {
    return { ok: false, error: "not_a_template" };
  }
  if (parsed.version !== TEMPLATE_FILE_VERSION) {
    return { ok: false, error: "unsupported_version" };
  }
  const draft = readBot(parsed.bot);
  return draft ? { ok: true, draft } : { ok: false, error: "invalid_file" };
}
