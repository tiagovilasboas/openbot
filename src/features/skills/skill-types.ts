/**
 * "imported" skills came from pasted SKILL.md text, which is not ours.
 * "suggested" ones were drafted by the model from the bot's own chats and
 * accepted by the user; their text is still model output.
 */
export type SkillSource = "created" | "imported" | "suggested";

/** Ceilings for stored skills: far above real use, so hostile storage is bounded. */
export const SKILL_ID_MAX_LENGTH = 100;
export const SKILL_LABEL_MAX_LENGTH = 200;
export const SKILL_TEXT_MAX_LENGTH = 20_000;
export const SKILLS_MAX_COUNT = 100;

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  instructions: string;
  command: string; // e.g. "/github", "/agenda", "/briefing", "/code-review"
  isBuiltin: boolean;
  source: SkillSource;
  createdAt: string;
}
