"use client";

import { Button, ButtonGroup } from "@heroui/react";
import { chatCopy } from "./chat-copy";
import type { ChatLanguage } from "./respond-to-message";

interface ChatHeaderProps {
  language: ChatLanguage;
  onLanguageChange: (language: ChatLanguage) => void;
}

export function ChatHeader({ language, onLanguageChange }: ChatHeaderProps) {
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
          <h1 className="truncate text-base font-semibold">{content.title}</h1>
          <p className="truncate text-xs text-muted">{content.subtitle}</p>
        </div>
      </div>
      <nav
        aria-label={content.mainNavLabel}
        className="flex shrink-0 items-center gap-2"
      >
        <ButtonGroup aria-label={content.languageLabel}>
          {(["pt", "en"] as const).map((option) => (
            <Button
              key={option}
              size="lg"
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
