"use client";

import { useId, useState } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { getBotsCopy } from "@/features/bots/bots-copy.ts";
import { SidebarBotRow } from "./SidebarBotRow.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

interface SidebarHiddenBotsProps {
  language: ChatLanguage;
  bots: BotProfile[];
  activeBotId: string;
  onSelectBot: (botId: string) => void;
  onEditBot: (bot: BotProfile) => void;
  onRestoreBot: (botId: string) => void;
}

const NO_REF = () => {};

/** The collapsed "Hidden" group at the end of the bot list. */
export function SidebarHiddenBots({
  language,
  bots,
  activeBotId,
  onSelectBot,
  onEditBot,
  onRestoreBot,
}: SidebarHiddenBotsProps) {
  const copy = getBotsCopy(language);
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  if (bots.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-label={`${copy.hiddenGroupToggle}: ${copy.hiddenGroup} (${bots.length})`}
        onClick={() => setExpanded((open) => !open)}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-medium text-subtle transition-colors hover:bg-surface hover:text-foreground"
      >
        <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
        <span>
          {copy.hiddenGroup} ({bots.length})
        </span>
      </button>
      <ul id={listId} hidden={!expanded} className="flex flex-col gap-0.5">
        {bots.map((bot) => (
          <SidebarBotRow
            key={bot.id}
            language={language}
            bot={bot}
            role={bot.title}
            isActive={bot.id === activeBotId}
            isWorking={false}
            rowRef={NO_REF}
            onSelect={() => onSelectBot(bot.id)}
            onEdit={() => onEditBot(bot)}
            onRestore={() => onRestoreBot(bot.id)}
          />
        ))}
      </ul>
    </div>
  );
}
