import {
  SKILL_ID_MAX_LENGTH,
  SKILL_LABEL_MAX_LENGTH,
  SKILL_TEXT_MAX_LENGTH,
  SKILLS_MAX_COUNT,
  type SkillDefinition,
  type SkillSource,
} from "./skill-types.ts";

const COMMAND_MAX_LENGTH = 64;
const DATE_MAX_LENGTH = 40;

/** The "/command" for a skill: the explicit one if given, else from the name. */
export function sanitizeCommand(
  name: string,
  explicitCommand?: string,
): string {
  if (explicitCommand && explicitCommand.trim()) {
    const raw = explicitCommand.trim().replace(/^\/+/, "");
    return `/${raw.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`;
  }
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `/${slug || "skill"}`;
}

export function sanitizeSkill(raw: unknown): SkillDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== "string" || !obj.id.trim()) return null;
  if (obj.id.trim().length > SKILL_ID_MAX_LENGTH) return null;
  if (typeof obj.name !== "string" || !obj.name.trim()) return null;

  const name = obj.name.trim().slice(0, SKILL_LABEL_MAX_LENGTH);
  return {
    id: obj.id.trim(),
    name,
    description:
      typeof obj.description === "string"
        ? obj.description.trim().slice(0, SKILL_TEXT_MAX_LENGTH)
        : "",
    instructions:
      typeof obj.instructions === "string"
        ? obj.instructions.trim().slice(0, SKILL_TEXT_MAX_LENGTH)
        : "",
    command: sanitizeCommand(
      name,
      typeof obj.command === "string"
        ? obj.command.slice(0, SKILL_LABEL_MAX_LENGTH)
        : undefined,
    ).slice(0, COMMAND_MAX_LENGTH),
    isBuiltin: false,
    source:
      obj.source === "imported" || obj.source === "suggested"
        ? obj.source
        : "created",
    createdAt:
      typeof obj.createdAt === "string"
        ? obj.createdAt.slice(0, DATE_MAX_LENGTH)
        : new Date().toISOString(),
  };
}

/** Valid skills from untrusted stored data; invalid entries are dropped. */
export function sanitizeSkillList(raw: unknown): SkillDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, SKILLS_MAX_COUNT)
    .map(sanitizeSkill)
    .filter((skill): skill is SkillDefinition => skill !== null);
}

export function createCustomSkill(input: {
  name: string;
  command?: string;
  description?: string;
  instructions: string;
  source?: SkillSource;
}): SkillDefinition {
  const id = `skill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    name: input.name.trim() || "Nova Skill",
    command: sanitizeCommand(input.name, input.command),
    description: input.description?.trim() || "",
    instructions: input.instructions.trim(),
    isBuiltin: false,
    source: input.source ?? "created",
    createdAt: new Date().toISOString(),
  };
}

export function parseSkillFromMarkdown(
  text: string,
): { name: string; description: string; instructions: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const lines = trimmed.split("\n");
  let name = "";
  let description = "";
  const instructionLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    if (!name && line.startsWith("# ")) {
      name = line.replace(/^#\s+/, "").trim();
      continue;
    }
    if (!description && line.startsWith("> ")) {
      description = line.replace(/^>\s+/, "").trim();
      continue;
    }
    instructionLines.push(lines[i] ?? "");
  }

  const instructions = instructionLines.join("\n").trim();
  if (!name && !instructions) return null;

  return {
    name: name || "Custom Skill",
    description: description || "Imported from markdown",
    instructions: instructions || trimmed,
  };
}
