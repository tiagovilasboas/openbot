"use client";

import { useId } from "react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { needsYouItems } from "./needs-you.ts";
import { needsYouGroupLabel, needsYouReasonLabel } from "./needs-you-copy.ts";
import { useFailedBots } from "./use-failed-bots.ts";

interface NeedsYouSectionProps {
  language: ChatLanguage;
  /** Bots the user can see, in list order. */
  bots: BotProfile[];
  activeBotId: string;
  approvalBotId?: string | null;
  attentionCounts?: Readonly<Record<string, number>>;
  onSelectBot: (botId: string) => void;
}

/** Agents waiting on the user, above the agent list; absent when none are. */
export function NeedsYouSection({
  language,
  bots,
  activeBotId,
  approvalBotId,
  attentionCounts = {},
  onSelectBot,
}: NeedsYouSectionProps) {
  const labelId = useId();
  const failedBotIds = useFailedBots(bots.map((bot) => bot.id));
  const items = needsYouItems({
    bots,
    activeBotId,
    approvalBotId,
    failedBotIds,
    attentionCounts,
  });
  if (items.length === 0) return null;

  return (
    <div role="group" aria-labelledby={labelId} className="mt-3 md:mt-5">
      <p
        id={labelId}
        className="px-3 pb-1 text-xs font-medium text-subtle md:pb-1.5"
      >
        {needsYouGroupLabel(language)} ({items.length})
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const bot = bots.find((b) => b.id === item.botId);
          if (!bot) return null;
          const reason = needsYouReasonLabel(language, item);
          return (
            <li key={bot.id}>
              <button
                type="button"
                aria-label={`${bot.name}: ${reason}`}
                onClick={() => onSelectBot(bot.id)}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 py-1 text-left md:gap-3 md:px-3 md:py-1.5 transition-[background-color,transform] duration-150 ease-out-expo hover:bg-surface active:scale-[0.98]"
              >
                <BotAvatar
                  shape={bot.avatarShape}
                  color={bot.avatarColor}
                  size={32}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm leading-5 font-medium text-foreground">
                    {bot.name}
                  </span>
                  <span className="truncate text-xs leading-4 text-muted md:text-[13px] md:leading-[18px]">
                    {reason}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
