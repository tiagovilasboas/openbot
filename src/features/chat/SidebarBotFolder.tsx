"use client";

import { useId, useState } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { SidebarBotList } from "./SidebarBotList.tsx";

interface SidebarBotFolderProps {
  language: ChatLanguage;
  name: string;
  bots: BotProfile[];
  activeBotId: string;
  shortcutOffset: number;
  workingBotIds?: readonly string[];
  attentionCounts?: Readonly<Record<string, number>>;
  onSelectBot: (botId: string) => void;
  onEditBot: (bot: BotProfile) => void;
}

/** One folder of bots in the sidebar; open by default, collapsible. */
export function SidebarBotFolder({
  name,
  bots,
  ...list
}: SidebarBotFolderProps) {
  const [expanded, setExpanded] = useState(true);
  const listId = useId();
  // A working bot or an unseen reply keeps the folder from hiding it.
  const needsYou = bots.some(
    (bot) =>
      list.workingBotIds?.includes(bot.id) ||
      (list.attentionCounts?.[bot.id] ?? 0) > 0,
  );
  return (
    <div className="mt-1 md:mt-2">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((open) => !open)}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-medium text-subtle transition-colors hover:bg-surface hover:text-foreground"
      >
        <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
        <span className="truncate">
          {name} ({bots.length})
        </span>
        {!expanded && needsYou && (
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-accent"
          />
        )}
      </button>
      <div id={listId} hidden={!expanded}>
        <SidebarBotList bots={bots} {...list} />
      </div>
    </div>
  );
}
