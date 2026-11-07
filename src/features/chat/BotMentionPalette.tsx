"use client";

import { useEffect, useRef, useState } from "react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface BotMentionPaletteProps {
  query: string;
  bots: BotProfile[];
  language: ChatLanguage;
  onSelect: (bot: BotProfile) => void;
  onClose: () => void;
}

export function BotMentionPalette({
  query,
  bots,
  language,
  onSelect,
  onClose,
}: BotMentionPaletteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const content = chatCopy[language];

  const normalized = query.toLowerCase().replace(/^@+/, "").trim();
  const filtered = bots.filter((b) => {
    if (!normalized) return true;
    return (
      b.name.toLowerCase().includes(normalized) ||
      Boolean(b.title?.toLowerCase().includes(normalized)) ||
      b.id.toLowerCase().includes(normalized)
    );
  });

  const activeIndex = selectedIndex < filtered.length ? selectedIndex : 0;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (filtered.length === 0) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => ((prev < filtered.length ? prev : 0) + 1) % filtered.length,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            ((prev < filtered.length ? prev : 0) - 1 + filtered.length) %
            filtered.length,
        );
      } else if (e.key === "Enter") {
        const item = filtered[activeIndex];
        if (item) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(item);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [filtered, activeIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={content.mentionPaletteLabel}
      className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-30"
    >
      <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-purple-400">
        {content.mentionPaletteLabel} ({filtered.length})
      </div>
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        {filtered.map((bot, index) => {
          const isSelected = index === activeIndex;
          return (
            <button
              key={bot.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(bot)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                isSelected
                  ? "bg-zinc-800 text-white"
                  : "hover:bg-zinc-800/60 text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BotAvatar
                  shape={bot.avatarShape}
                  color={bot.avatarColor}
                  size={22}
                />
                <div className="truncate">
                  <span className="text-sm font-semibold text-white">
                    @{bot.name}
                  </span>
                  <span className="ml-2 text-xs text-zinc-400 truncate hidden sm:inline">
                    {bot.title}
                  </span>
                </div>
              </div>
              <span className="font-mono text-[10px] text-purple-400/80 bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-lg shrink-0">
                bot
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
