"use client";

import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { getBotsCopy } from "./bots-copy.ts";

export interface BotSkillsSelectorProps {
  allSkills: SkillDefinition[];
  selectedSkills: string[];
  isPt: boolean;
  onToggleSkill: (skillId: string) => void;
}

export function BotSkillsSelector({
  allSkills,
  selectedSkills,
  isPt,
  onToggleSkill,
}: BotSkillsSelectorProps) {
  const copy = getBotsCopy(isPt);

  return (
    <section aria-labelledby="bot-skills-label" className="flex flex-col gap-2">
      <h3
        id="bot-skills-label"
        className="text-[15px] font-medium text-foreground md:text-sm"
      >
        {copy.skillsLabel}
      </h3>
      {allSkills.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-[13px] text-muted">
          {copy.skillsEmpty}
        </p>
      ) : (
        <ul className="divide-y divide-separator rounded-xl border border-border bg-surface">
          {allSkills.map((skill) => {
            const checked = selectedSkills.includes(skill.id);
            return (
              <li key={skill.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[15px] font-medium text-foreground md:text-sm">
                        {skill.name}
                      </span>
                      <span className="font-mono text-[13px] text-subtle">
                        {skill.command}
                      </span>
                    </span>
                    {skill.description && (
                      <span className="block truncate text-[13px] text-muted">
                        {skill.description}
                      </span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={checked}
                    onChange={() => onToggleSkill(skill.id)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="relative h-6 w-10 shrink-0 rounded-full bg-surface-tertiary transition-colors duration-[140ms] peer-checked:bg-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bot-accent peer-checked:[&>span]:translate-x-4 peer-checked:[&>span]:bg-background"
                  >
                    <span className="absolute start-1 top-1 size-4 rounded-full bg-muted transition-transform duration-[140ms]" />
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
