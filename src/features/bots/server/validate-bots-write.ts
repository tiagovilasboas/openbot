import {
  SKILL_TEXT_MAX_LENGTH,
  SKILLS_MAX_COUNT,
} from "../../skills/skill-types.ts";
import { sanitizeBotProfile } from "../bot-storage.ts";
import {
  BOT_TEXT_MAX_LENGTH,
  BOTS_MAX_COUNT,
  type BotProfile,
} from "../bot-types.ts";

export type BotsWriteError =
  "invalid_body" | "invalid_bot" | "too_many_bots" | "too_many_skills";

export type BotsWriteResult =
  { ok: true; bots: BotProfile[] } | { ok: false; error: BotsWriteError };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function textTooLong(value: unknown, max: number): boolean {
  return typeof value === "string" && value.trim().length > max;
}

function skillExceedsLimits(raw: unknown): boolean {
  if (!isRecord(raw)) return true;
  return (
    textTooLong(raw.description, SKILL_TEXT_MAX_LENGTH) ||
    textTooLong(raw.instructions, SKILL_TEXT_MAX_LENGTH)
  );
}

// The client silently truncates on load; a write is stricter and refuses
// anything over the same ceilings instead of changing it.
function botError(raw: unknown): BotsWriteError | null {
  if (!isRecord(raw)) return "invalid_bot";
  if (
    textTooLong(raw.description, BOT_TEXT_MAX_LENGTH) ||
    textTooLong(raw.workspaceContext, BOT_TEXT_MAX_LENGTH)
  ) {
    return "invalid_bot";
  }
  if (raw.skills === undefined) return null;
  if (!Array.isArray(raw.skills)) return "invalid_bot";
  if (raw.skills.length > SKILLS_MAX_COUNT) return "too_many_skills";
  return raw.skills.some(skillExceedsLimits) ? "invalid_bot" : null;
}

// Validates a whole bot list with the client's own sanitizers. One bad bot
// rejects the list; ids must be unique and the list non-empty.
export function validateBotsWrite(raw: unknown): BotsWriteResult {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "invalid_body" };
  }
  if (raw.length > BOTS_MAX_COUNT) return { ok: false, error: "too_many_bots" };
  const seen = new Set<string>();
  const bots: BotProfile[] = [];
  for (const entry of raw) {
    const error = botError(entry);
    if (error) return { ok: false, error };
    const bot = sanitizeBotProfile(entry);
    if (!bot || seen.has(bot.id)) return { ok: false, error: "invalid_bot" };
    // A skill the sanitizer drops (or a legacy id string) is a bad bot here.
    const rawSkills = (entry as { skills?: unknown[] }).skills ?? [];
    if (rawSkills.length !== bot.skills.length) {
      return { ok: false, error: "invalid_bot" };
    }
    seen.add(bot.id);
    bots.push(bot);
  }
  return { ok: true, bots };
}
