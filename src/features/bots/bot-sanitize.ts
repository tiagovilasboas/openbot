import {
  AVATAR_COLORS,
  AVATAR_SHAPES,
  BOT_LABEL_MAX_LENGTH,
  BOT_NAME_MAX_LENGTH,
  BOT_TEXT_MAX_LENGTH,
  BOTS_MAX_COUNT,
  DEFAULT_BOT,
  LEGACY_SHAPES,
  type AvatarColor,
  type AvatarShape,
  type BotProfile,
} from "./bot-types.ts";
import { sanitizeModelId } from "../model/model-id.ts";
import { isValidBotId } from "./bot-id.ts";
import { sanitizeSkill } from "../skills/skill-definition.ts";
import {
  SKILLS_MAX_COUNT,
  type SkillDefinition,
} from "../skills/skill-types.ts";

function migrateShape(val: unknown): AvatarShape {
  if (typeof val !== "string") return DEFAULT_BOT.avatarShape;
  if ((AVATAR_SHAPES as readonly string[]).includes(val)) {
    return val as AvatarShape;
  }
  return Object.hasOwn(LEGACY_SHAPES, val)
    ? LEGACY_SHAPES[val]!
    : DEFAULT_BOT.avatarShape;
}

function isValidColor(val: unknown): val is AvatarColor {
  return (
    typeof val === "string" &&
    (AVATAR_COLORS as readonly string[]).includes(val)
  );
}

/**
 * A bot's own skills. Before bots owned their skills, `skills` held ids into
 * one global library: `library` resolves those, and unknown ids are dropped.
 */
function sanitizeBotSkills(
  raw: unknown,
  library: readonly SkillDefinition[],
): SkillDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, SKILLS_MAX_COUNT).flatMap((entry): SkillDefinition[] => {
    const skill =
      typeof entry === "string"
        ? library.find((s) => s.id === entry)
        : sanitizeSkill(entry);
    return skill ? [skill] : [];
  });
}

/** A spread-ready `modelId`: absent when the stored value is not valid. */
function optionalModelId(raw: unknown): { modelId?: string } {
  const modelId = sanitizeModelId(raw);
  return modelId ? { modelId } : {};
}

export function sanitizeBotProfile(
  raw: unknown,
  library: readonly SkillDefinition[] = [],
): BotProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== "string" || !obj.id.trim()) return null;
  if (typeof obj.name !== "string" || !obj.name.trim()) return null;

  const rawId = obj.id.trim();
  if (!isValidBotId(rawId)) return null;
  const rawName = obj.name.trim().slice(0, BOT_NAME_MAX_LENGTH).trim();

  // Canonical upgrade for legacy default bot
  const isLegacyDefault =
    rawId === "default" ||
    (rawId === "chief-of-staff" && rawName === "OpenBot") ||
    rawName === "OpenBot";

  const id = isLegacyDefault ? DEFAULT_BOT.id : rawId;
  const name = isLegacyDefault ? DEFAULT_BOT.name : rawName;
  const title = isLegacyDefault
    ? DEFAULT_BOT.title
    : typeof obj.title === "string"
      ? obj.title.trim().slice(0, BOT_LABEL_MAX_LENGTH)
      : undefined;

  const shape: AvatarShape =
    isLegacyDefault &&
    (obj.avatarShape === "hex" || obj.avatarShape === "shield")
      ? DEFAULT_BOT.avatarShape
      : migrateShape(obj.avatarShape);

  const color: AvatarColor = isValidColor(obj.avatarColor)
    ? isLegacyDefault && obj.avatarColor === "cyan"
      ? DEFAULT_BOT.avatarColor
      : obj.avatarColor
    : isLegacyDefault
      ? DEFAULT_BOT.avatarColor
      : "cyan";

  const skills = sanitizeBotSkills(obj.skills, library);

  return {
    id,
    name,
    title,
    description:
      typeof obj.description === "string" &&
      obj.description.trim() &&
      !obj.description.includes("Você é o OpenBot, um assistente rápido")
        ? obj.description.trim().slice(0, BOT_TEXT_MAX_LENGTH)
        : DEFAULT_BOT.description,
    workspaceContext:
      typeof obj.workspaceContext === "string" && obj.workspaceContext.trim()
        ? obj.workspaceContext.trim().slice(0, BOT_TEXT_MAX_LENGTH)
        : undefined,
    ...optionalModelId(obj.modelId),
    ...(obj.toolsEnabled === true ? { toolsEnabled: true } : {}),
    avatarShape: shape,
    avatarColor: color,
    skills,
    createdAt:
      typeof obj.createdAt === "string"
        ? obj.createdAt.slice(0, 40)
        : new Date().toISOString(),
    updatedAt:
      typeof obj.updatedAt === "string"
        ? obj.updatedAt.slice(0, 40)
        : new Date().toISOString(),
  };
}

/** A raw bot list, sanitized: invalid entries dropped, ids unique, capped. */
export function sanitizeBotList(
  parsed: readonly unknown[],
  library: readonly SkillDefinition[] = [],
): BotProfile[] {
  const seen = new Set<string>();
  return parsed
    .slice(0, BOTS_MAX_COUNT)
    .map((bot) => sanitizeBotProfile(bot, library))
    .filter((b): b is BotProfile => b !== null)
    .filter((b) => !seen.has(b.id) && Boolean(seen.add(b.id)));
}
