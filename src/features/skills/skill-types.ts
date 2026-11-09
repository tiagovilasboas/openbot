export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  instructions: string;
  command: string; // e.g. "/github", "/agenda", "/briefing", "/code-review"
  isBuiltin: boolean;
  createdAt: string;
}
