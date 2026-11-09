"use client";

import type { ReactNode } from "react";
import { chatCopy } from "./chat-copy.ts";
import {
  ArrowUpIcon,
  MentionIcon,
  QueueIcon,
  SlashCommandIcon,
} from "./ComposerIcons.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import type { PaletteKind } from "./use-composer-palette.ts";

interface ComposerToolbarProps {
  language: ChatLanguage;
  paletteId: string;
  openPalette: PaletteKind | null;
  busy: boolean;
  canSend: boolean;
  onTogglePalette: (kind: PaletteKind) => void;
}

function PaletteToggle({
  label,
  isOpen,
  paletteId,
  onClick,
  children,
}: {
  label: string;
  isOpen: boolean;
  paletteId: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={isOpen}
      aria-controls={isOpen ? paletteId : undefined}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary hover:text-foreground active:scale-[0.97] ${
        isOpen ? "bg-surface-secondary text-foreground" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function ComposerToolbar({
  language,
  paletteId,
  openPalette,
  busy,
  canSend,
  onTogglePalette,
}: ComposerToolbarProps) {
  const content = chatCopy[language];
  const sendLabel = busy ? content.queueMessageLabel : content.sendMessageLabel;

  return (
    <div className="flex items-center gap-0.5 px-1.5 pb-1.5">
      <PaletteToggle
        label={content.skillPaletteButtonAria}
        isOpen={openPalette === "skills"}
        paletteId={paletteId}
        onClick={() => onTogglePalette("skills")}
      >
        <SlashCommandIcon />
      </PaletteToggle>
      <PaletteToggle
        label={content.mentionButtonAria}
        isOpen={openPalette === "bots"}
        paletteId={paletteId}
        onClick={() => onTogglePalette("bots")}
      >
        <MentionIcon />
      </PaletteToggle>

      <p className="ml-1.5 hidden select-none text-xs text-subtle md:pointer-fine:block">
        {content.composerHint}
      </p>

      <button
        type="submit"
        disabled={!canSend}
        aria-label={sendLabel}
        title={sendLabel}
        className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-[opacity,transform] duration-(--duration-micro) ease-out-expo hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
      >
        {busy ? <QueueIcon /> : <ArrowUpIcon />}
      </button>
    </div>
  );
}
