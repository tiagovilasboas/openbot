"use client";

import type { ReactNode } from "react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { Language } from "@/features/language/language.ts";
import { CrewRoomControl } from "@/features/crew/CrewRoomControl.tsx";
import type { ChannelEntry } from "./channel-timeline.ts";
import { getChannelsCopy } from "./channels-copy.ts";

interface ChannelMessageRowProps {
  entry: ChannelEntry;
  language: Language;
  /** Buttons under the message (reply, thread). */
  children?: ReactNode;
}

/** One message of a group, in the main timeline and in a thread alike. */
export function ChannelMessageRow({
  entry,
  language,
  children,
}: ChannelMessageRowProps) {
  const copy = getChannelsCopy(language);
  const nameOf = (bot: ChannelEntry["bot"]) => bot?.name ?? copy.removedBot;
  return (
    <li data-testid="group-message" className="group/msg flex gap-3">
      {entry.bot ? (
        <BotAvatar
          shape={entry.bot.avatarShape}
          color={entry.bot.avatarColor}
          size={28}
        />
      ) : (
        <span className="size-7 shrink-0" aria-hidden="true" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex items-center gap-2 text-xs md:text-[13px] font-semibold text-foreground">
          {entry.fromPerson ? copy.you : nameOf(entry.bot)}
          {entry.failed && (
            <span className="font-normal text-danger">{copy.failed}</span>
          )}
        </p>
        {entry.replyTo && (
          <p className="line-clamp-2 border-s-2 border-border ps-2 text-xs text-muted md:text-[13px]">
            {entry.replyTo.bot ? `${nameOf(entry.replyTo.bot)}: ` : ""}
            {entry.replyTo.text}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.55] text-foreground">
          {entry.text}
        </p>
        {entry.room && (
          <CrewRoomControl room={entry.room} language={language} />
        )}
        {children}
      </div>
    </li>
  );
}
