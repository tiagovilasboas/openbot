import type { AvatarColor, AvatarShape } from "../bots/bot-types.ts";
import type { SkillDefinition } from "../skills/skill-types.ts";

export const TEMPLATE_FILE_APP = "openbot";
export const TEMPLATE_FILE_KIND = "bot-template";
export const TEMPLATE_FILE_VERSION = 1;
export const TEMPLATE_FILE_MAX_BYTES = 256 * 1024;
export const TEMPLATE_MAX_SKILLS = 30;

/** A skill as written in the file: no ids, dates or origin flags. */
export interface TemplateFileSkill {
  name: string;
  command: string;
  description: string;
  instructions: string;
}

/** The only bot fields a template file carries. */
export interface TemplateFileBot {
  name: string;
  title?: string;
  description: string;
  workspaceContext?: string;
  modelId?: string;
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  skills: TemplateFileSkill[];
}

export interface BotTemplateFile {
  app: typeof TEMPLATE_FILE_APP;
  kind: typeof TEMPLATE_FILE_KIND;
  version: typeof TEMPLATE_FILE_VERSION;
  exportedAt: string;
  bot: TemplateFileBot;
}

/** What importing a template gives the form: a bot without identity. */
export interface BotTemplateDraft {
  name: string;
  title?: string;
  description: string;
  workspaceContext?: string;
  modelId?: string;
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  /** Always marked imported: the text came from a file, not from the user. */
  skills: SkillDefinition[];
}

export type BotTemplateErrorCode =
  "invalid_file" | "not_a_template" | "unsupported_version" | "too_large";

export type ParseBotTemplateResult =
  | { ok: true; draft: BotTemplateDraft }
  | { ok: false; error: BotTemplateErrorCode };
