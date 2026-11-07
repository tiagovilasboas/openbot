"use client";

import { useState } from "react";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { CommandPalette } from "./CommandPalette.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

interface ChatComposerProps {
  language: ChatLanguage;
  draft: string;
  busy: boolean;
  mode?: "hero" | "docked";
  skills?: SkillDefinition[];
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function ChatComposer({
  language,
  draft,
  busy,
  mode = "docked",
  skills = [],
  onDraftChange,
  onSend,
}: ChatComposerProps) {
  const content = chatCopy[language];
  const isHero = mode === "hero";
  const canSend = Boolean(draft.trim()) && !busy;
  const [showPaletteManual, setShowPaletteManual] = useState(false);

  const isSlashActive = draft.startsWith("/") || showPaletteManual;

  function handleSelectSkill(skill: SkillDefinition) {
    setShowPaletteManual(false);
    if (skill.id === "summary") {
      onDraftChange(
        language === "pt" ? "Briefing de hoje" : "Today's Briefing",
      );
    } else if (skill.id === "calendar") {
      onDraftChange(
        language === "pt" ? "Agenda de exemplo" : "Sample calendar",
      );
    } else if (skill.id === "github") {
      onDraftChange("Issues de tiagovilasboas/openbot");
    } else {
      onDraftChange(`${skill.command} `);
    }
  }

  return (
    <form
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) {
          onSend();
        }
      }}
    >
      {isSlashActive && skills.length > 0 && (
        <CommandPalette
          query={draft}
          skills={skills}
          onSelect={handleSelectSkill}
          onClose={() => setShowPaletteManual(false)}
        />
      )}

      <div
        className={`group relative flex flex-col w-full rounded-2xl border border-white/12 bg-zinc-900/95 shadow-xl shadow-black/60 backdrop-blur-xl transition-all duration-150 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 ${
          isHero ? "p-3 sm:p-3.5 sm:rounded-3xl" : "p-2 sm:p-2.5"
        }`}
      >
        <textarea
          aria-label={content.composerLabel}
          className={`w-full flex-1 resize-none border-0 bg-transparent text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-0 leading-snug [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isHero
              ? "min-h-[44px] text-sm sm:text-base"
              : "min-h-[26px] max-h-36 text-sm"
          }`}
          placeholder={content.placeholder}
          value={draft}
          rows={isHero ? 2 : 1}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) {
                onSend();
              }
            }
          }}
        />

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Abrir catálogo de skills (/)"
              onClick={() => {
                if (!draft.startsWith("/")) {
                  onDraftChange("/");
                }
                setShowPaletteManual((v) => !v);
              }}
              className="flex size-6 sm:size-7 items-center justify-center rounded-lg border border-white/10 bg-zinc-800/80 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors font-mono text-xs font-semibold"
            >
              /
            </button>
            <p className="text-[11px] text-zinc-500 select-none pl-1 hidden sm:block">
              {content.composerHint}
            </p>
          </div>

          <button
            type="submit"
            disabled={!canSend}
            aria-label={content.sendMessageLabel}
            className={`flex items-center justify-center rounded-full bg-white text-black font-semibold transition-all duration-150 active:scale-95 hover:bg-zinc-200 disabled:opacity-20 disabled:pointer-events-none ${
              isHero ? "size-9 sm:size-10" : "size-8 sm:size-9"
            }`}
          >
            <ArrowUpIcon className={isHero ? "size-4 sm:size-5" : "size-4"} />
          </button>
        </div>
      </div>
    </form>
  );
}
