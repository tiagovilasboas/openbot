"use client";

import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { EditIcon } from "./ShellIcons.tsx";

interface SidebarBotListProps {
  language: ChatLanguage;
  bots: BotProfile[];
  activeBotId: string;
  /** The bot leading the crew; it shows the Chief of Staff role. */
  mainBotId?: string;
  onSelectBot: (botId: string) => void;
  onEditBot: (bot: BotProfile) => void;
}

export function SidebarBotList({
  language,
  bots,
  activeBotId,
  mainBotId,
  onSelectBot,
  onEditBot,
}: SidebarBotListProps) {
  const content = chatCopy[language];

  return (
    <ul className="flex flex-col gap-0.5">
      {bots.map((bot) => {
        const isActive = bot.id === activeBotId;
        const role =
          bot.id === mainBotId ? content.chiefOfStaffTitle : bot.title;

        return (
          <li key={bot.id} className="group relative">
            <button
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelectBot(bot.id)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-xl py-2 pr-12 pl-3 text-left transition-[background-color,transform] duration-150 ease-out-expo active:scale-[0.98] ${
                isActive ? "bg-surface-tertiary" : "hover:bg-surface"
              }`}
            >
              <BotAvatar
                shape={bot.avatarShape}
                color={bot.avatarColor}
                size={38}
                active={isActive}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] leading-5 font-medium text-foreground md:text-sm">
                  {bot.name}
                </span>
                {role && (
                  <span className="truncate text-[13px] leading-[18px] text-muted">
                    {role}
                  </span>
                )}
              </span>
            </button>

            <button
              type="button"
              aria-label={`${content.editBotAria} ${bot.name}`}
              onClick={() => onEditBot(bot)}
              className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-subtle transition-[opacity,background-color,color,scale] duration-150 ease-out-expo hover:bg-surface-secondary hover:text-foreground active:scale-[0.97] pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100"
            >
              <EditIcon className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
