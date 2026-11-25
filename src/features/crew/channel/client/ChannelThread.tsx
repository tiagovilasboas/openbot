"use client";

import { useMemo } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { Language } from "@/features/language/language.ts";
import type { CrewChannel } from "../crew-channel.ts";
import { ChannelComposer } from "./ChannelComposer.tsx";
import { ChannelMessageRow } from "./ChannelMessageRow.tsx";
import { buildChannelTimeline, type ChannelEntry } from "./channel-timeline.ts";
import { channelErrorText, getChannelsCopy } from "./channels-copy.ts";
import { useChannelRoom } from "./use-channel-room.ts";

interface ChannelThreadProps {
  channel: CrewChannel;
  bots: BotProfile[];
  language: Language;
  /** The main-timeline message the thread comments on. */
  parent: ChannelEntry;
  onBack: () => void;
}

const SMALL_BUTTON =
  "min-h-9 rounded-full px-3 text-xs font-medium md:text-[13px] transition-colors active:scale-[0.97]";

/**
 * A side thread on one reply: the parent on top, the comments below. The
 * parent's author answers unless the person calls someone with @name. It
 * takes the place of the timeline inside the group's own sheet, so there is
 * one overlay on phone and desktop alike.
 */
export function ChannelThread({
  channel,
  bots,
  language,
  parent,
  onBack,
}: ChannelThreadProps) {
  const copy = getChannelsCopy(language);
  const room = useChannelRoom(channel.id, parent.seq);
  const entries = useMemo(
    () => buildChannelTimeline(room.messages, bots),
    [room.messages, bots],
  );
  const speaking = bots.find((bot) => bot.id === room.speakingBotId);
  const defaultName = parent.bot?.name ?? copy.removedBot;

  return (
    <section
      aria-label={copy.threadTitle}
      className="flex flex-col gap-4"
      data-testid="group-thread"
    >
      <button
        type="button"
        onClick={onBack}
        className={`${SMALL_BUTTON} self-start px-0 text-muted hover:text-foreground`}
      >
        {copy.backToGroup}
      </button>
      <ol className="flex flex-col gap-3 border-b border-separator pb-3">
        <ChannelMessageRow entry={parent} language={language} />
      </ol>
      <ol className="flex flex-col gap-3" aria-live="polite">
        {entries.map((entry) => (
          <ChannelMessageRow
            key={entry.seq}
            entry={entry}
            language={language}
          />
        ))}
      </ol>

      {room.answering && (
        <p role="status" className="text-xs md:text-[13px] text-muted">
          {speaking ? copy.speaking(speaking.name) : copy.working}
        </p>
      )}
      {room.error && (
        <p role="alert" className="text-xs md:text-[13px] text-danger">
          {channelErrorText(copy, room.error)}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted md:text-[13px]">
          {copy.threadHint(defaultName)}
        </p>
        <ChannelComposer
          label={copy.threadPlaceholder}
          placeholder={copy.threadPlaceholder}
          sendLabel={copy.send}
          sending={room.sending}
          onSend={(text) => room.post(text)}
        />
      </div>
    </section>
  );
}
