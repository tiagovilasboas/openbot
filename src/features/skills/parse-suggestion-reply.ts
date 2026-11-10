import { sanitizeCommand } from "./skill-definition.ts";
import {
  SUGGESTION_MAX_DESCRIPTION,
  SUGGESTION_MAX_INSTRUCTIONS,
  SUGGESTION_MAX_NAME,
} from "./suggestion-limits.ts";

/** A skill the model proposed. Nothing in it is trusted until accepted. */
export interface SkillDraft {
  name: string;
  command: string;
  description: string;
  instructions: string;
}

const FENCE = /^```[a-z]*[ \t]*\r?\n?([\s\S]*?)\r?\n?```$/i;
// Keeps \n and \t in the instructions; everything else invisible goes.
const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;
const ANY_CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;

function stripFence(text: string): string {
  const trimmed = text.trim();
  const match = FENCE.exec(trimmed);
  return match ? (match[1] ?? "").trim() : trimmed;
}

/** "Revisão" -> "Revisao": the sanitizer is ASCII-only and would write "revis-o". */
function withoutAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}+/gu, "");
}

function oneLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(ANY_CONTROL, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

function block(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_EXCEPT_NEWLINE, "").trim().slice(0, max).trim();
}

/**
 * The skill in a model reply, or null when the reply is not usable: not JSON
 * (one code fence around it is tolerated), not an object, or missing a name
 * or instructions. Fields are cut to their caps and the command always comes
 * from the app's own sanitizer, never from the reply.
 */
export function parseSuggestionReply(reply: string): SkillDraft | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(reply));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const fields = parsed as Record<string, unknown>;
  const name = oneLine(fields.name, SUGGESTION_MAX_NAME);
  const instructions = block(fields.instructions, SUGGESTION_MAX_INSTRUCTIONS);
  if (!name || !instructions) return null;
  return {
    name,
    command: sanitizeCommand(withoutAccents(name)),
    description: oneLine(fields.description, SUGGESTION_MAX_DESCRIPTION),
    instructions,
  };
}
