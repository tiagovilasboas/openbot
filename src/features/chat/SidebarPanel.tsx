"use client";

import { useId } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { AuthorCredit } from "@/shared/brand/AuthorCredit.tsx";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { SidebarActionRow } from "./SidebarActionRow.tsx";
import { SidebarBotList } from "./SidebarBotList.tsx";
import { SidebarBotFolder } from "./SidebarBotFolder.tsx";
import { groupByFolder } from "@/features/bots/bot-folders.ts";
import { SidebarHiddenBots } from "./SidebarHiddenBots.tsx";
import { SidebarGroups } from "@/features/crew/channel/client/SidebarGroups.tsx";
import { NeedsYouSection } from "@/features/attention/NeedsYouSection.tsx";
import { hiddenBots, visibleBots } from "@/features/bots/bot-visibility.ts";
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
  mainBotId?: string;
  /** Bots answering a message right now. */
  workingBotIds?: readonly string[];
  /** Replies per bot the user has not seen yet. */
  attentionCounts?: Readonly<Record<string, number>>;
  /** The bot whose tool turn waits for the user's approval. */
  approvalBotId?: string | null;
  /** Set while no model is connected: bots cannot be used, and this says why. */
  agentsLockedReason?: string;
  onSelectBot: (botId: string) => void;
  onReorderBot?: (botId: string, toIndex: number) => void;
  onCreateBot: () => void;
  onEditBot: (bot: BotProfile) => void;
  onRestoreBot?: (botId: string) => void;
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
  mainBotId,
  workingBotIds,
  attentionCounts,
  approvalBotId,
  agentsLockedReason,
  onSelectBot,
  onReorderBot,
  onCreateBot,
  onEditBot,
  onRestoreBot,
  onOpenSettings,
  hasPassword,
  onLock,
  onNewChat,
  canStartNewChat = true,
}: SidebarNavProps) {
  const content = chatCopy[language];
  const botsLabelId = useId();
  const shownBots = visibleBots(bots);
  const groups = groupByFolder(bots, mainBotId);
  // The loose list reorders by its own rows; the stored list also holds
  // hidden and foldered bots, so a drop maps onto the row it landed on.
  const reorderLoose =
    onReorderBot &&
    ((id: string, toIndex: number) => {
      const anchor =
        groups.loose[Math.min(Math.max(toIndex, 0), groups.loose.length - 1)];
      const target = bots.findIndex((bot) => bot.id === anchor?.id);
      if (target !== -1) onReorderBot(id, target);
    });
  const tuckedAway = hiddenBots(bots);

  return (
    <>
      <nav
        aria-label={content.mainNavLabel}
        className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain px-2 pb-2 md:pb-3"
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

        <NeedsYouSection
          language={language}
          bots={shownBots}
          activeBotId={activeBotId}
          approvalBotId={approvalBotId}
          attentionCounts={attentionCounts}
          onSelectBot={onSelectBot}
        />

        <div
          role="group"
          aria-labelledby={botsLabelId}
          className="mt-3 md:mt-5"
        >
          <p
            id={botsLabelId}
            className="px-3 pb-1 text-xs font-medium text-subtle md:pb-1.5"
          >
            {content.sidebarBotsGroup}
          </p>
          {agentsLockedReason && (
            <p role="status" className="px-3 pb-2 text-[13px] text-muted">
              {agentsLockedReason}
            </p>
          )}
          <fieldset
            disabled={Boolean(agentsLockedReason)}
            className="m-0 min-w-0 border-0 p-0 disabled:opacity-50"
          >
            <SidebarBotList
              language={language}
              bots={groups.loose}
              activeBotId={activeBotId}
              mainBotId={mainBotId}
              workingBotIds={workingBotIds}
              attentionCounts={attentionCounts}
              onSelectBot={onSelectBot}
              onEditBot={onEditBot}
              onReorderBot={reorderLoose}
            />
            {groups.folders.map((folder, index) => (
              <SidebarBotFolder
                key={folder.name}
                language={language}
                name={folder.name}
                bots={folder.bots}
                activeBotId={activeBotId}
                shortcutOffset={
                  groups.loose.length +
                  groups.folders
                    .slice(0, index)
                    .reduce((sum, f) => sum + f.bots.length, 0)
                }
                workingBotIds={workingBotIds}
                attentionCounts={attentionCounts}
                onSelectBot={onSelectBot}
                onEditBot={onEditBot}
              />
            ))}
            <div className="mt-0.5">
              <SidebarActionRow
                icon={<CreateBotGlyph />}
                label={content.sidebarCreateBot}
                onPress={onCreateBot}
                disabled={Boolean(agentsLockedReason)}
              />
            </div>
          </fieldset>
          {onRestoreBot && (
            <SidebarHiddenBots
              language={language}
              bots={tuckedAway}
              activeBotId={activeBotId}
              onSelectBot={onSelectBot}
              onEditBot={onEditBot}
              onRestoreBot={onRestoreBot}
            />
          )}
        </div>

        {!agentsLockedReason && (
          <SidebarGroups
            language={language}
            bots={bots}
            mainBotId={mainBotId}
          />
        )}
      </nav>

      <div className="flex shrink-0 flex-col gap-1 border-t border-separator px-2 py-1 md:py-2">
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
