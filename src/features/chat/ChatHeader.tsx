"use client";

import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ModelStatus } from "@/features/model/model-status.ts";
import {
  MODEL_STATUS_DOT,
  ModelStatusBadge,
} from "@/features/model/ModelStatusBadge.tsx";
import { chatCopy } from "./chat-copy.ts";
import { LanguageToggle } from "./LanguageToggle.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import { BrandMark } from "@/shared/brand/BrandMark.tsx";
import { MenuIcon, NewChatIcon } from "./ShellIcons.tsx";

interface ChatHeaderProps {
  language: ChatLanguage;
  onLanguageChange: (language: ChatLanguage) => void;
  activeModelLabel: string;
  modelStatus: ModelStatus;
  onOpenSettings?: () => void;
  /** Opens the per-bot model picker; the badge prefers it over settings. */
  onOpenModelPicker?: () => void;
  /** Names the picker action for assistive tech. */
  modelPickerLabel?: string;
  hasMessages?: boolean;
  onNewChat?: () => void;
  activeBot?: BotProfile;
  onOpenMobileSidebar?: () => void;
  onOpenBotEdit?: () => void;
  /** Whether the phone sidebar drawer is open (for aria-expanded). */
  isMobileSidebarOpen?: boolean;
  /** How full the model's context window is; shown in the model pill. */
  contextUsage?: { text: string; isWarning: boolean };
}

const ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-[background-color,color,transform] duration-150 ease-out-expo hover:bg-surface hover:text-foreground active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

export function ChatHeader({
  language,
  onLanguageChange,
  activeModelLabel,
  modelStatus,
  onOpenSettings,
  onOpenModelPicker,
  modelPickerLabel,
  hasMessages,
  onNewChat,
  activeBot,
  onOpenMobileSidebar,
  onOpenBotEdit,
  isMobileSidebarOpen,
  contextUsage,
}: ChatHeaderProps) {
  const content = chatCopy[language];
  const statusNote =
    modelStatus === "failing" ? content.modelStatusFailing : undefined;

  const identity = (
    <>
      {activeBot ? (
        <BotAvatar
          shape={activeBot.avatarShape}
          color={activeBot.avatarColor}
          size="var(--header-avatar)"
        />
      ) : (
        <BrandMark />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[15px] leading-5 font-semibold text-foreground md:font-medium">
          {activeBot ? activeBot.name : content.brandName}
        </span>
      </span>
    </>
  );

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-separator bg-background pt-safe pr-safe pl-safe md:pl-0">
      <div className="flex h-12 items-center gap-0.5 px-1 [--header-avatar:32px] md:h-14 md:gap-3 md:px-4 md:[--header-avatar:41px]">
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
              className="flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-xl px-1.5 text-left md:gap-2.5 md:px-2 transition-[background-color,transform] duration-150 ease-out-expo hover:bg-surface active:scale-[0.99]"
            >
              {identity}
              <span className="sr-only">, {content.headerEditBot}</span>
            </button>
          ) : (
            <span className="flex min-h-11 min-w-0 items-center gap-2 px-1.5 md:gap-2.5 md:px-2">
              {identity}
            </span>
          )}
        </h1>

        <div className="hidden min-w-0 md:flex">
          <ModelStatusBadge
            label={activeModelLabel}
            status={modelStatus}
            statusNote={statusNote}
            contextUsage={contextUsage}
            onPress={onOpenModelPicker ?? onOpenSettings}
            actionLabel={
              onOpenModelPicker
                ? modelPickerLabel
                : onOpenSettings
                  ? content.headerModelSettings
                  : undefined
            }
          />
        </div>

        {onOpenModelPicker && (
          <button
            type="button"
            aria-label={modelPickerLabel}
            aria-haspopup="dialog"
            title={activeModelLabel}
            onClick={onOpenModelPicker}
            className={`${ICON_BUTTON} md:hidden`}
          >
            <span className="flex size-7 items-center justify-center rounded-full border border-border bg-surface">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${MODEL_STATUS_DOT[modelStatus]}`}
              />
            </span>
            {statusNote && <span className="sr-only">, {statusNote}</span>}
          </button>
        )}

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
