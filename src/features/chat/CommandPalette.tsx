"use client";

import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { ComposerPalette } from "./ComposerPalette.tsx";
import { SlashCommandIcon } from "./ComposerIcons.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

interface CommandPaletteProps {
  id: string;
  language: ChatLanguage;
  /** Skills already filtered by the typed `/query`. */
  skills: SkillDefinition[];
  /** False when the active bot has no skills at all. */
  hasSkills: boolean;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (skill: SkillDefinition) => void;
}

export function CommandPalette({
  id,
  language,
  skills,
  hasSkills,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: CommandPaletteProps) {
  const content = chatCopy[language];

  return (
    <ComposerPalette
      id={id}
      label={content.skillPaletteLabel}
      activeIndex={activeIndex}
      emptyTitle={
        hasSkills ? content.skillPaletteEmpty : content.skillPaletteNone
      }
      emptyHint={
        hasSkills ? content.skillPaletteEmptyHint : content.skillPaletteNoneHint
      }
      onActiveIndexChange={onActiveIndexChange}
      onSelect={(index) => {
        const skill = skills[index];
        if (skill) onSelect(skill);
      }}
      rows={skills.map((skill) => ({
        key: skill.id,
        leading: (
          <span className="flex size-8 items-center justify-center rounded-lg bg-surface-secondary text-muted">
            <SlashCommandIcon className="size-4" />
          </span>
        ),
        title: (
          <>
            {skill.name}
            <span className="ml-2 font-mono text-xs font-normal text-subtle">
              {skill.command}
            </span>
          </>
        ),
        description: skill.description,
        trailing: skill.isBuiltin ? (
          <span className="shrink-0 text-xs font-medium text-subtle">
            {content.skillBuiltin}
          </span>
        ) : undefined,
      }))}
    />
  );
}
