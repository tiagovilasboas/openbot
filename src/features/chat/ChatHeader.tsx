"use client";

import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { ModelStatusBadge } from "@/features/model/ModelStatusBadge.tsx";
import { chatCopy } from "./chat-copy.ts";
import { LanguageToggle } from "./LanguageToggle.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import { BrandMark, MenuIcon, NewChatIcon } from "./ShellIcons.tsx";

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
  /** Whether the phone sidebar drawer is open (for aria-expanded). */
  isMobileSidebarOpen?: boolean;
}

const ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-[background-color,color,transform] duration-150 ease-out-expo hover:bg-surface hover:text-foreground active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

/** The phone status line only has room for the model id's last segment. */
function compactModelLabel(label: string): string {
  return label.split("/").pop()?.trim() || label;
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
  isMobileSidebarOpen,
}: ChatHeaderProps) {
  const content = chatCopy[language];

  const identity = (
    <>
      {activeBot ? (
        <BotAvatar
          shape={activeBot.avatarShape}
          color={activeBot.avatarColor}
          size={28}
        />
      ) : (
        <BrandMark />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[15px] leading-5 font-medium text-foreground">
          {activeBot ? activeBot.name : content.brandName}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-subtle md:hidden">
          <span
            aria-hidden="true"
            className={`size-1.5 shrink-0 rounded-full ${
              isConfigured ? "bg-success" : "bg-warning"
            }`}
          />
          <span className="truncate">
            {compactModelLabel(activeModelLabel)}
          </span>
        </span>
      </span>
    </>
  );

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-separator bg-background pt-safe pr-safe pl-safe md:pl-0">
      <div className="flex h-14 items-center gap-1 px-1.5 md:gap-3 md:px-4">
        {onOpenMobileSidebar && (
          <button
            type="button"
            aria-label={content.sidebarOpen}
            aria-expanded={isMobileSidebarOpen}
            onClick={onOpenMobileSidebar}
            className={`${ICON_BUTTON} md:hidden`}
          >
            <MenuIcon />
          </button>
        )}

        <h1 className="flex min-w-0 flex-1">
          {onOpenBotEdit ? (
            <button
              type="button"
              onClick={onOpenBotEdit}
              className="flex min-h-11 max-w-full min-w-0 items-center gap-2.5 rounded-xl px-2 text-left transition-[background-color,transform] duration-150 ease-out-expo hover:bg-surface active:scale-[0.99]"
            >
              {identity}
              <span className="sr-only">, {content.headerEditBot}</span>
            </button>
          ) : (
            <span className="flex min-h-11 min-w-0 items-center gap-2.5 px-2">
              {identity}
            </span>
          )}
        </h1>

        <div className="hidden min-w-0 md:flex">
          <ModelStatusBadge
            label={activeModelLabel}
            isConfigured={isConfigured}
            onPress={onOpenSettings}
            actionLabel={
              onOpenSettings ? content.headerModelSettings : undefined
            }
          />
        </div>

        <div className="hidden md:block">
          <LanguageToggle language={language} onChange={onLanguageChange} />
        </div>

        {onNewChat && (
          <button
            type="button"
            aria-label={content.newChat}
            title={content.newChat}
            disabled={!hasMessages}
            onClick={onNewChat}
            className={ICON_BUTTON}
          >
            <NewChatIcon />
          </button>
        )}
      </div>
    </header>
  );
}
