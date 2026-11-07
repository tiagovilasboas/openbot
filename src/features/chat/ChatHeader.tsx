"use client";

import { Button, ButtonGroup } from "@heroui/react";
import { ModelStatusBadge } from "@/features/model/ModelStatusBadge.tsx";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface ChatHeaderProps {
  language: ChatLanguage;
  onLanguageChange: (language: ChatLanguage) => void;
  activeModelLabel: string;
  isConfigured: boolean;
  onOpenSettings: () => void;
  hasMessages?: boolean;
  onNewChat?: () => void;
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChatHeader({
  language,
  onLanguageChange,
  activeModelLabel,
  isConfigured,
  onOpenSettings,
  hasMessages,
  onNewChat,
}: ChatHeaderProps) {
  const content = chatCopy[language];

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b border-white/5 bg-black/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs font-bold shadow-sm"
        >
          &gt;_
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2.5">
          <h1 className="shrink-0 text-sm sm:text-base font-semibold tracking-tight text-white">
            {content.title}
          </h1>
          <ModelStatusBadge
            label={activeModelLabel}
            isConfigured={isConfigured}
            onPress={onOpenSettings}
          />
        </div>
      </div>

      <nav
        aria-label={content.mainNavLabel}
        className="flex shrink-0 items-center gap-1 sm:gap-2"
      >
        {hasMessages && onNewChat && (
          <Button
            size="sm"
            variant="secondary"
            aria-label={content.newChat}
            onPress={onNewChat}
            className="gap-1 border border-white/10 bg-zinc-900/70 text-zinc-300 hover:border-white/20 hover:bg-zinc-800 hover:text-white px-2 sm:px-3"
          >
            <PlusIcon />
            <span className="hidden sm:inline">{content.newChat}</span>
          </Button>
        )}

        <Button
          size="sm"
          variant="secondary"
          aria-label={content.settings}
          onPress={onOpenSettings}
          className="gap-1.5 border border-white/10 bg-zinc-900/70 text-zinc-300 hover:border-white/20 hover:bg-zinc-800 hover:text-white px-2 sm:px-3"
        >
          <GearIcon />
          <span className="hidden sm:inline">{content.settings}</span>
        </Button>

        <ButtonGroup
          aria-label={content.languageLabel}
          className="scale-90 sm:scale-100 origin-right"
        >
          {(["pt", "en"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={language === option ? "secondary" : "ghost"}
              aria-pressed={language === option}
              onPress={() => onLanguageChange(option)}
              className={
                language === option
                  ? "border border-white/10 bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }
            >
              {option.toUpperCase()}
            </Button>
          ))}
        </ButtonGroup>
      </nav>
    </header>
  );
}
