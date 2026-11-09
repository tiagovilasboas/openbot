"use client";

import { Focusable, Tooltip } from "@heroui/react";
import type { ReactNode } from "react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import { chatCopy } from "./chat-copy.ts";
import { CreateBotGlyph, type SidebarNavProps } from "./SidebarPanel.tsx";
import { LockIcon, NewChatIcon, SettingsIcon } from "./ShellIcons.tsx";

interface RailButtonProps {
  label: string;
  onPress: () => void;
  children: ReactNode;
  isCurrent?: boolean;
  disabled?: boolean;
  expanded?: boolean;
}

/** A 44px icon button for the collapsed rail, named and tooltipped. */
export function RailButton({
  label,
  onPress,
  children,
  isCurrent,
  disabled,
  expanded,
}: RailButtonProps) {
  return (
    <Tooltip delay={300} closeDelay={0}>
      <Focusable isDisabled={disabled}>
        <button
          type="button"
          aria-label={label}
          aria-current={isCurrent ? "page" : undefined}
          aria-expanded={expanded}
          disabled={disabled}
          onClick={onPress}
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-[background-color,color,transform] duration-150 ease-out-expo hover:bg-surface hover:text-foreground active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${
            isCurrent ? "text-foreground" : "text-muted"
          }`}
        >
          {children}
        </button>
      </Focusable>
      <Tooltip.Content
        placement="right"
        offset={10}
        className="px-2.5 py-1.5 text-xs font-medium text-foreground"
      >
        {label}
      </Tooltip.Content>
    </Tooltip>
  );
}

/** The collapsed desktop sidebar: avatars and icons only, 64px wide. */
export function SidebarRail({
  language,
  bots,
  activeBotId,
  onSelectBot,
  onCreateBot,
  onOpenSettings,
  hasPassword,
  onLock,
  onNewChat,
  canStartNewChat = true,
}: SidebarNavProps) {
  const content = chatCopy[language];

  return (
    <>
      <nav
        aria-label={content.mainNavLabel}
        className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto overscroll-contain pb-3"
      >
        {onNewChat && (
          <RailButton
            label={content.newChat}
            onPress={onNewChat}
            disabled={!canStartNewChat}
          >
            <NewChatIcon />
          </RailButton>
        )}

        <ul
          aria-label={content.sidebarBotsGroup}
          className="mt-4 flex flex-col items-center gap-1"
        >
          {bots.map((bot) => {
            const isActive = bot.id === activeBotId;
            return (
              <li key={bot.id}>
                <RailButton
                  label={bot.name}
                  isCurrent={isActive}
                  onPress={() => onSelectBot(bot.id)}
                >
                  <BotAvatar
                    shape={bot.avatarShape}
                    color={bot.avatarColor}
                    size={34}
                    active={isActive}
                  />
                </RailButton>
              </li>
            );
          })}
          <li>
            <RailButton label={content.sidebarCreateBot} onPress={onCreateBot}>
              <CreateBotGlyph />
            </RailButton>
          </li>
        </ul>
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-separator py-2">
        {hasPassword && onLock && (
          <RailButton label={content.sidebarLock} onPress={onLock}>
            <LockIcon />
          </RailButton>
        )}
        <RailButton label={content.settings} onPress={onOpenSettings}>
          <SettingsIcon />
        </RailButton>
      </div>
    </>
  );
}
