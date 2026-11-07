import { BUILTIN_SKILLS, type SkillDefinition } from "./skill-types.ts";

export const SKILLS_STORAGE_KEY = "openbot_custom_skills";

function sanitizeCommand(name: string, explicitCommand?: string): string {
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
  if (typeof obj.name !== "string" || !obj.name.trim()) return null;

  return {
    id: obj.id.trim(),
    name: obj.name.trim(),
    description:
      typeof obj.description === "string" ? obj.description.trim() : "",
    instructions:
      typeof obj.instructions === "string" ? obj.instructions.trim() : "",
    command: sanitizeCommand(
      obj.name.trim(),
      typeof obj.command === "string" ? obj.command : undefined,
    ),
    isBuiltin: false,
    createdAt:
      typeof obj.createdAt === "string"
        ? obj.createdAt
        : new Date().toISOString(),
  };
}

const EMPTY_CUSTOM_SKILLS: SkillDefinition[] = [];
let cachedCustomSkillsRaw: string | null = null;
let cachedCustomSkills: SkillDefinition[] = EMPTY_CUSTOM_SKILLS;
let customSkillsListeners: Array<() => void> = [];

export function subscribeCustomSkills(listener: () => void): () => void {
  customSkillsListeners.push(listener);
  return () => {
    customSkillsListeners = customSkillsListeners.filter((l) => l !== listener);
  };
}

export function loadCustomSkillsFromStorage(
  storage?: Storage,
): SkillDefinition[] {
  try {
    const isDefaultStorage = !storage;
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return EMPTY_CUSTOM_SKILLS;

    const raw = s.getItem(SKILLS_STORAGE_KEY);
    if (!raw) {
      if (isDefaultStorage) {
        cachedCustomSkillsRaw = null;
        cachedCustomSkills = EMPTY_CUSTOM_SKILLS;
      }
      return EMPTY_CUSTOM_SKILLS;
    }
    if (isDefaultStorage && raw === cachedCustomSkillsRaw) {
      return cachedCustomSkills;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_CUSTOM_SKILLS;

    const sanitized = parsed
      .map(sanitizeSkill)
      .filter((skill): skill is SkillDefinition => skill !== null);

    if (isDefaultStorage) {
      cachedCustomSkillsRaw = raw;
      cachedCustomSkills = sanitized;
    }
    return sanitized;
  } catch {
    return EMPTY_CUSTOM_SKILLS;
  }
}

export function saveCustomSkillsToStorage(
  skills: SkillDefinition[],
  storage?: Storage,
): void {
  try {
    const isDefaultStorage = !storage;
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return;
    const raw = JSON.stringify(skills);
    s.setItem(SKILLS_STORAGE_KEY, raw);
    if (isDefaultStorage) {
      cachedCustomSkillsRaw = raw;
      cachedCustomSkills = skills;
      customSkillsListeners.forEach((l) => l());
    }
  } catch {
    // ignore
  }
}

export function getAllSkills(
  customSkills: SkillDefinition[],
): SkillDefinition[] {
  return [...BUILTIN_SKILLS, ...customSkills];
}

export function createCustomSkill(input: {
  name: string;
  command?: string;
  description?: string;
  instructions: string;
}): SkillDefinition {
  const id = `skill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    name: input.name.trim() || "Nova Skill",
    command: sanitizeCommand(input.name, input.command),
    description: input.description?.trim() || "",
    instructions: input.instructions.trim(),
    isBuiltin: false,
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
