"use client";

import { useId, useLayoutEffect, useRef } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { BotMentionPalette } from "./BotMentionPalette.tsx";
import { chatCopy } from "./chat-copy.ts";
import { CommandPalette } from "./CommandPalette.tsx";
import { paletteOptionId } from "./ComposerPalette.tsx";
import { ComposerToolbar } from "./ComposerToolbar.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import { useCoarsePointer } from "./use-coarse-pointer.ts";
import { useComposerPalette } from "./use-composer-palette.ts";

interface ChatComposerProps {
  language: ChatLanguage;
  draft: string;
  /** While a reply runs, sending still works: the message joins the queue. */
  busy: boolean;
  /** Kept for compatibility; ConversationView renders the queue status. */
  queueCount?: number;
  mode?: "hero" | "docked";
  skills?: SkillDefinition[];
  bots?: BotProfile[];
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export function ChatComposer({
  language,
  draft,
  busy,
  mode = "docked",
  skills = [],
  bots = [],
  onDraftChange,
  onSend,
}: ChatComposerProps) {
  const content = chatCopy[language];
  const canSend = Boolean(draft.trim());
  const isCoarsePointer = useCoarsePointer();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const paletteId = useId();
  const palette = useComposerPalette({ draft, skills, bots, onDraftChange });
  const activeOption =
    palette.kind && palette.activeIndex >= 0
      ? paletteOptionId(paletteId, palette.activeIndex)
      : undefined;

  // Grow with the draft up to the CSS max-height, then scroll. An empty
  // draft keeps one row, so a wrapping placeholder never inflates it.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    if (!draft) return;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  function submit() {
    if (canSend) onSend();
  }

  return (
    <form
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {palette.kind === "skills" && (
        <CommandPalette
          id={paletteId}
          language={language}
          skills={palette.skillItems}
          hasSkills={palette.hasSkills}
          activeIndex={palette.activeIndex}
          onActiveIndexChange={palette.setActiveIndex}
          onSelect={palette.selectSkill}
        />
      )}
      {palette.kind === "bots" && (
        <BotMentionPalette
          id={paletteId}
          language={language}
          bots={palette.botItems}
          activeIndex={palette.activeIndex}
          onActiveIndexChange={palette.setActiveIndex}
          onSelect={palette.selectBot}
        />
      )}

      <div
        className="flex w-full cursor-text flex-col rounded-3xl border border-border bg-surface transition-colors duration-(--duration-ui) ease-out-expo focus-within:border-[color:color-mix(in_oklab,var(--bot-accent)_45%,var(--border))]"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest("button, textarea")) textareaRef.current?.focus();
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          aria-label={content.composerLabel}
          aria-autocomplete="list"
          aria-controls={palette.kind ? paletteId : undefined}
          aria-activedescendant={activeOption}
          placeholder={content.composerPlaceholder}
          enterKeyHint={isCoarsePointer ? "enter" : "send"}
          autoComplete="off"
          className={`block max-h-[40dvh] w-full resize-none overflow-y-auto bg-transparent px-4 pb-1 pt-3.5 text-base leading-6 text-foreground outline-hidden placeholder:text-subtle md:max-h-[18rem] md:text-[15px] md:leading-[22px] ${
            mode === "hero" ? "md:min-h-16" : ""
          }`}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (palette.handleKeyDown(event)) return;
            if (event.key !== "Enter" || event.shiftKey) return;
            if (event.nativeEvent.isComposing || isCoarsePointer) return;
            event.preventDefault();
            submit();
          }}
        />

        <ComposerToolbar
          language={language}
          paletteId={paletteId}
          openPalette={palette.kind}
          busy={busy}
          canSend={canSend}
          onTogglePalette={(kind) => {
            palette.toggle(kind);
            textareaRef.current?.focus();
          }}
        />
      </div>
    </form>
  );
}
