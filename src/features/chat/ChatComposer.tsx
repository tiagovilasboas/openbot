"use client";

import { useId, useLayoutEffect, useRef } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { AttachButton } from "@/features/attachments/AttachButton.tsx";
import { AttachmentChips } from "@/features/attachments/AttachmentChips.tsx";
import { useFileDrop } from "@/features/attachments/use-file-drop.ts";
import type { ComposerAttachments } from "@/features/attachments/use-composer-attachments.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { COMPOSER_ATTRIBUTE } from "./agent-shortcut.ts";
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
  /** Without a model the placeholder says so; sending and commands still work. */
  isConfigured?: boolean;
  /** Why the composer is locked; set, it is disabled and says so. */
  disabledReason?: string;
  skills?: SkillDefinition[];
  bots?: BotProfile[];
  /** The files waiting on the message; without it the composer has no attach. */
  attachments?: ComposerAttachments;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export function ChatComposer({
  language,
  draft,
  busy,
  mode = "docked",
  isConfigured = true,
  disabledReason,
  skills = [],
  bots = [],
  attachments,
  onDraftChange,
  onSend,
}: ChatComposerProps) {
  const content = chatCopy[language];
  const canSend = Boolean(draft.trim());
  const isCoarsePointer = useCoarsePointer();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const paletteId = useId();
  const drop = useFileDrop((files) => void attachments?.addFiles(files));
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
    if (canSend && !disabledReason) onSend();
  }

  const reasonId = `${paletteId}-reason`;

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

      <fieldset
        disabled={Boolean(disabledReason)}
        aria-describedby={disabledReason ? reasonId : undefined}
        className={`m-0 flex w-full min-w-0 cursor-text flex-col disabled:opacity-60 rounded-[1.375rem] border md:rounded-3xl bg-surface transition-colors duration-(--duration-ui) ease-out-expo focus-within:border-[color:color-mix(in_oklab,var(--bot-accent)_45%,var(--border))] ${
          drop.dragging ? "border-dashed border-bot-accent" : "border-border"
        }`}
        {...(attachments ? drop.handlers : {})}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest("button, textarea")) textareaRef.current?.focus();
        }}
      >
        {attachments && (
          <AttachmentChips
            language={language}
            items={attachments.items}
            notice={attachments.notice}
            onRemove={attachments.remove}
          />
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          {...{ [COMPOSER_ATTRIBUTE]: "" }}
          aria-label={content.composerLabel}
          aria-autocomplete="list"
          aria-controls={palette.kind ? paletteId : undefined}
          aria-activedescendant={activeOption}
          placeholder={
            disabledReason ??
            (isConfigured
              ? content.composerPlaceholder
              : content.composerNoModelPlaceholder)
          }
          enterKeyHint={isCoarsePointer ? "enter" : "send"}
          autoComplete="off"
          className={`block max-h-[40dvh] w-full resize-none overflow-y-auto bg-transparent px-3.5 pb-0.5 pt-2.5 text-base leading-6 md:px-4 md:pb-1 md:pt-3.5 text-foreground outline-hidden placeholder:text-subtle md:max-h-[18rem] md:text-[15px] md:leading-[22px] ${
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
          actions={
            attachments && (
              <AttachButton
                language={language}
                onFiles={(files) => void attachments.addFiles(files)}
              />
            )
          }
          onTogglePalette={(kind) => {
            palette.toggle(kind);
            textareaRef.current?.focus();
          }}
        />
      </fieldset>
      {disabledReason && (
        <p
          id={reasonId}
          className="mt-1.5 px-4 text-center text-xs text-muted md:mt-2 md:text-[13px]"
        >
          {disabledReason}
        </p>
      )}
    </form>
  );
}
