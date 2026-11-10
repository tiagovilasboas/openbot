/** "imported" skills came from pasted SKILL.md text, which is not ours. */
export type SkillSource = "created" | "imported";

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
