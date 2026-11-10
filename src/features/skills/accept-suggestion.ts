import { createCustomSkill } from "./skill-definition.ts";
import type { SkillDraft } from "./parse-suggestion-reply.ts";
import type { SkillDefinition } from "./skill-types.ts";

/** The command, or the first "-2", "-3"... variant the bot does not use. */
function freeCommand(
  command: string,
  existing: readonly SkillDefinition[],
): string {
  const taken = new Set(existing.map((skill) => skill.command));
  if (!taken.has(command)) return command;
  for (let n = 2; ; n++) {
    const candidate = `${command}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * The skill the user accepted, marked "suggested". It is the same kind of
 * skill as any other; only the badge tells where its text came from.
 */
export function acceptSuggestion(
  draft: SkillDraft,
  existing: readonly SkillDefinition[],
): SkillDefinition {
  return createCustomSkill({
    name: draft.name,
    command: freeCommand(draft.command, existing),
    description: draft.description,
    instructions: draft.instructions,
    source: "suggested",
  });
}
