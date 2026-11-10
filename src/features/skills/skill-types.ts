/**
 * "imported" skills came from pasted SKILL.md text, which is not ours.
 * "suggested" ones were drafted by the model from the bot's own chats and
 * accepted by the user; their text is still model output.
 */
export type SkillSource = "created" | "imported" | "suggested";

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
