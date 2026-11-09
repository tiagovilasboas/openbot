"use client";

import { useId } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { AuthorCredit } from "@/shared/brand/AuthorCredit.tsx";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { SidebarActionRow } from "./SidebarActionRow.tsx";
import { SidebarBotList } from "./SidebarBotList.tsx";
import {
  LockIcon,
  NewChatIcon,
  PlusIcon,
  SettingsIcon,
} from "./ShellIcons.tsx";

/** What the sidebar navigates and acts on, shared by panel, rail and drawer. */
export interface SidebarNavProps {
  language: ChatLanguage;
  bots: BotProfile[];
  activeBotId: string;
  onSelectBot: (botId: string) => void;
  onCreateBot: () => void;
  onEditBot: (bot: BotProfile) => void;
  onOpenSettings: () => void;
  hasPassword?: boolean;
  onLock?: () => void;
  onNewChat?: () => void;
  canStartNewChat?: boolean;
}

export function CreateBotGlyph() {
  return (
    <span className="flex size-8 items-center justify-center rounded-full border border-dashed border-border">
      <PlusIcon className="size-4" />
    </span>
  );
}

/** The expanded sidebar: new chat, bots, create bot, then a pinned footer. */
export function SidebarPanel({
  language,
  bots,
  activeBotId,
  onSelectBot,
  onCreateBot,
  onEditBot,
  onOpenSettings,
  hasPassword,
  onLock,
  onNewChat,
  canStartNewChat = true,
}: SidebarNavProps) {
  const content = chatCopy[language];
  const botsLabelId = useId();

  return (
    <>
      <nav
        aria-label={content.mainNavLabel}
        className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain px-2 pb-3"
      >
        {onNewChat && (
          <SidebarActionRow
            icon={<NewChatIcon />}
            label={content.newChat}
            onPress={onNewChat}
            disabled={!canStartNewChat}
            emphasis
          />
        )}

        <div role="group" aria-labelledby={botsLabelId} className="mt-5">
          <p
            id={botsLabelId}
            className="px-3 pb-1.5 text-xs font-medium text-subtle"
          >
            {content.sidebarBotsGroup}
          </p>
          <SidebarBotList
            language={language}
            bots={bots}
            activeBotId={activeBotId}
            onSelectBot={onSelectBot}
            onEditBot={onEditBot}
          />
          <div className="mt-0.5">
            <SidebarActionRow
              icon={<CreateBotGlyph />}
              label={content.sidebarCreateBot}
              onPress={onCreateBot}
            />
          </div>
        </div>
      </nav>

      <div className="flex shrink-0 flex-col gap-1 border-t border-separator px-2 py-2">
        {hasPassword && onLock && (
          <SidebarActionRow
            icon={<LockIcon />}
            label={content.sidebarLock}
            onPress={onLock}
          />
        )}
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <SidebarActionRow
              icon={<SettingsIcon />}
              label={content.settings}
              onPress={onOpenSettings}
            />
          </div>
          <AuthorCredit
            profileTitle={content.authorProfileTitle}
            sponsorLabel={content.authorSponsorLabel}
            className="shrink-0 pr-1"
          />
        </div>
      </div>
    </>
  );
}
