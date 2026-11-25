"use client";

import { useMemo, useState } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { Language } from "@/features/language/language.ts";
import type { CrewChannel } from "../crew-channel.ts";
import { ChannelComposer } from "./ChannelComposer.tsx";
import { ChannelMessageRow } from "./ChannelMessageRow.tsx";
import { ChannelThread } from "./ChannelThread.tsx";
import { buildChannelTimeline, type ChannelEntry } from "./channel-timeline.ts";
import { channelErrorText, getChannelsCopy } from "./channels-copy.ts";
import { useChannelRoom } from "./use-channel-room.ts";

interface ChannelRoomProps {
  channel: CrewChannel;
  bots: BotProfile[];
  language: Language;
}

const SMALL_BUTTON =
  "min-h-9 rounded-full px-3 text-xs font-medium md:text-[13px] transition-colors active:scale-[0.97]";
const LINK_BUTTON = `${SMALL_BUTTON} self-start px-0 text-muted hover:text-foreground`;

/**
 * A group chat: the person and the members in one timeline. Answers land
 * live, each member says who it is, and the person can reply to a message,
 * open a side thread on it, call someone with @name or everyone with @todos,
 * and stop the group.
 */
export function ChannelRoom({ channel, bots, language }: ChannelRoomProps) {
  const copy = getChannelsCopy(language);
  const room = useChannelRoom(channel.id);
  const [replyTo, setReplyTo] = useState<ChannelEntry | null>(null);
  const [thread, setThread] = useState<ChannelEntry | null>(null);
  const timeline = useMemo(
    () => buildChannelTimeline(room.messages, bots, room.threadCounts),
    [room.messages, room.threadCounts, bots],
  );
  const nameOf = (entry: { bot: BotProfile | null }) =>
    entry.bot?.name ?? copy.removedBot;
  const speaking = bots.find((bot) => bot.id === room.speakingBotId);

  async function send(text: string): Promise<boolean> {
    const sent = await room.post(text, replyTo?.seq);
    if (sent) setReplyTo(null);
    return sent;
  }

  function closeThread() {
    setThread(null);
    void room.refresh();
  }

  if (thread) {
    return (
      <ChannelThread
        channel={channel}
        bots={bots}
        language={language}
        parent={thread}
        onBack={closeThread}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {timeline.length === 0 ? (
        <p className="text-xs md:text-[13px] text-subtle">{copy.roomEmpty}</p>
      ) : (
        <ol className="flex flex-col gap-3" aria-live="polite">
          {timeline.map((entry) => (
            <ChannelMessageRow
              key={entry.seq}
              entry={entry}
              language={language}
            >
              {entry.bot && (
                <div className="flex flex-wrap items-center gap-x-4">
                  <button
                    type="button"
                    onClick={() => setReplyTo(entry)}
                    aria-label={`${copy.reply}: ${nameOf(entry)}`}
                    className={LINK_BUTTON}
                  >
                    {copy.reply}
                  </button>
                  <button
                    type="button"
                    onClick={() => setThread(entry)}
                    aria-label={`${copy.replyInThread}: ${nameOf(entry)}`}
                    className={LINK_BUTTON}
                  >
                    {copy.replyInThread}
                  </button>
                </div>
              )}
              {entry.replyCount ? (
                <button
                  type="button"
                  onClick={() => setThread(entry)}
                  className={`${LINK_BUTTON} font-semibold text-accent`}
                >
                  {copy.replyCount(entry.replyCount)}
                </button>
              ) : null}
            </ChannelMessageRow>
          ))}
        </ol>
      )}

      {room.answering && (
        <div className="flex items-center justify-between gap-2">
          <p role="status" className="text-xs md:text-[13px] text-muted">
            {speaking ? copy.speaking(speaking.name) : copy.working}
          </p>
          <button
            type="button"
            onClick={() => void room.stop()}
            className={`${SMALL_BUTTON} border border-border text-foreground hover:bg-surface-secondary`}
          >
            {copy.stop}
          </button>
        </div>
      )}
      {room.error && (
        <p role="alert" className="text-xs md:text-[13px] text-danger">
          {channelErrorText(copy, room.error)}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {replyTo && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-1.5">
            <p className="min-w-0 truncate text-xs text-muted md:text-[13px]">
              {copy.replyingTo(nameOf(replyTo))}
            </p>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className={`${SMALL_BUTTON} text-muted hover:text-foreground`}
            >
              {copy.cancelReply}
            </button>
          </div>
        )}
        <ChannelComposer
          label={copy.postLabel}
          placeholder={copy.postPlaceholder}
          sendLabel={copy.send}
          sending={room.sending}
          onSend={send}
        />
      </div>
    </div>
  );
}
