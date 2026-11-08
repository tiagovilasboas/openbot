"use client";

import type { SkillDefinition } from "@/features/skills/skill-types.ts";

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
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {isPt ? "Skills Habilitadas neste Bot" : "Skills Enabled on this Bot"}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {allSkills.length === 0 ? (
          <p className="text-xs text-zinc-500 italic col-span-1 sm:col-span-2 py-3 text-center border border-dashed border-white/10 rounded-xl">
            {isPt
              ? "Nenhuma skill cadastrada ainda. Crie suas skills em Configurações > Skills."
              : "No skills configured yet. Create your skills in Settings > Skills."}
          </p>
        ) : (
          allSkills.map((skill) => {
            const isSelected = selectedSkills.includes(skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => onToggleSkill(skill.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-emerald-500/40 bg-emerald-500/10 text-white"
                    : "border-white/5 bg-zinc-900/40 text-zinc-400 hover:border-white/15"
                }`}
              >
                <span
                  className={`size-3 rounded-full mt-1 shrink-0 ${
                    isSelected
                      ? "bg-emerald-400 shadow-sm"
                      : "border border-zinc-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white">
                    {skill.name}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {skill.description}
                  </p>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {skill.command}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
