"use client";

import { Button, ButtonGroup } from "@heroui/react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { ModelStatusBadge } from "@/features/model/ModelStatusBadge.tsx";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface ChatHeaderProps {
  language: ChatLanguage;
  onLanguageChange: (language: ChatLanguage) => void;
  activeModelLabel: string;
  isConfigured: boolean;
  onOpenSettings?: () => void;
  hasMessages?: boolean;
  onNewChat?: () => void;
  activeBot?: BotProfile;
  onOpenMobileSidebar?: () => void;
  onOpenBotEdit?: () => void;
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
  activeBot,
  onOpenMobileSidebar,
  onOpenBotEdit,
}: ChatHeaderProps) {
  const content = chatCopy[language];

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b border-white/5 bg-black/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {onOpenMobileSidebar && (
          <button
            type="button"
            aria-label="Menu"
            onClick={onOpenMobileSidebar}
            className="flex size-8 shrink-0 md:hidden items-center justify-center rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs font-bold shadow-sm"
          >
            ☰
          </button>
        )}
        <div
          role={onOpenBotEdit ? "button" : undefined}
          onClick={onOpenBotEdit}
          className={`flex min-w-0 items-center gap-2 rounded-xl py-0.5 px-1 transition-all ${
            onOpenBotEdit ? "cursor-pointer hover:bg-zinc-900/60" : ""
          }`}
        >
          {activeBot ? (
            <BotAvatar
              shape={activeBot.avatarShape}
              color={activeBot.avatarColor}
              size={26}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs font-bold shadow-sm"
            >
              &gt;_
            </div>
          )}
          <h1 className="shrink-0 text-sm sm:text-base font-semibold tracking-tight text-white">
            {activeBot ? activeBot.name : content.title}
          </h1>
        </div>
        <ModelStatusBadge
          label={activeModelLabel}
          isConfigured={isConfigured}
          onPress={onOpenSettings}
        />
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
