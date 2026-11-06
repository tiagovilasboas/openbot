"use client";

import { Button, ButtonGroup } from "@heroui/react";
import { ModelStatusBadge } from "@/features/model/ModelStatusBadge";
import { chatCopy } from "./chat-copy";
import type { ChatLanguage } from "./respond-to-message";

interface ChatHeaderProps {
  language: ChatLanguage;
  onLanguageChange: (language: ChatLanguage) => void;
  activeModelLabel: string;
  isConfigured: boolean;
  onOpenSettings: () => void;
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

export function ChatHeader({
  language,
  onLanguageChange,
  activeModelLabel,
  isConfigured,
  onOpenSettings,
}: ChatHeaderProps) {
  const content = chatCopy[language];

  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-separator px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground"
        >
          &gt;_
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold">
              {content.title}
            </h1>
            <div className="hidden sm:block">
              <ModelStatusBadge
                label={activeModelLabel}
                isConfigured={isConfigured}
                onPress={onOpenSettings}
              />
            </div>
          </div>
          <p className="truncate text-xs text-muted">{content.subtitle}</p>
        </div>
      </div>
      <nav
        aria-label={content.mainNavLabel}
        className="flex shrink-0 items-center gap-2"
      >
        <div className="sm:hidden">
          <ModelStatusBadge
            label={activeModelLabel}
            isConfigured={isConfigured}
            onPress={onOpenSettings}
          />
        </div>
        <Button
          size="md"
          variant="ghost"
          isIconOnly
          aria-label={content.settings}
          onPress={onOpenSettings}
          className="sm:hidden"
        >
          <GearIcon />
        </Button>
        <Button
          size="md"
          variant="secondary"
          aria-label={content.settings}
          onPress={onOpenSettings}
          className="hidden gap-1.5 sm:inline-flex"
        >
          <GearIcon />
          <span>{content.settings}</span>
        </Button>
        <ButtonGroup aria-label={content.languageLabel}>
          {(["pt", "en"] as const).map((option) => (
            <Button
              key={option}
              size="md"
              variant={language === option ? "secondary" : "ghost"}
              aria-pressed={language === option}
              onPress={() => onLanguageChange(option)}
            >
              {option.toUpperCase()}
            </Button>
          ))}
        </ButtonGroup>
      </nav>
    </header>
  );
}
