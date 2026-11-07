"use client";

import { useEffect, useRef } from "react";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";

interface CommandPaletteProps {
  query: string;
  skills: SkillDefinition[];
  onSelect: (skill: SkillDefinition) => void;
  onClose: () => void;
}

export function CommandPalette({
  query,
  skills,
  onSelect,
  onClose,
}: CommandPaletteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const normalized = query.toLowerCase().replace(/^\/+/, "");

  const filtered = skills.filter(
    (s) =>
      s.command.toLowerCase().includes(normalized) ||
      s.name.toLowerCase().includes(normalized) ||
      s.description.toLowerCase().includes(normalized),
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Comandos de Skills"
      className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-30"
    >
      <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        Skills Disponíveis ({filtered.length})
      </div>
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        {filtered.map((skill, index) => (
          <button
            key={skill.id}
            type="button"
            role="option"
            aria-selected={index === 0}
            onClick={() => onSelect(skill)}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-xs font-semibold text-cyan-400 bg-cyan-950/70 border border-cyan-800/40 px-2 py-0.5 rounded-lg shrink-0">
                {skill.command}
              </span>
              <div className="truncate">
                <span className="text-sm font-medium text-white">
                  {skill.name}
                </span>
                <span className="ml-2 text-xs text-zinc-400 truncate hidden sm:inline">
                  {skill.description}
                </span>
              </div>
            </div>
            {skill.isBuiltin && (
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">
                Nativa
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
