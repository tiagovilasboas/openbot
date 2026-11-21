"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { Language } from "@/features/language/language.ts";
import { CrewRoomControl } from "@/features/crew/CrewRoomControl.tsx";
import { FormField, TEXTAREA_CLASS } from "@/shared/ui/FormField.tsx";
import { MAX_CHANNEL_POST_LENGTH } from "../channel-message.ts";
import type { CrewChannel } from "../crew-channel.ts";
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

/**
 * A group chat: the person and the members in one timeline. Answers land
 * live, each member says who it is, and the person can reply to a message,
 * call someone with @name or everyone with @todos, and stop the group.
 */
export function ChannelRoom({ channel, bots, language }: ChannelRoomProps) {
  const copy = getChannelsCopy(language);
  const room = useChannelRoom(channel.id);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChannelEntry | null>(null);
  const timeline = useMemo(
    () => buildChannelTimeline(room.messages, bots),
    [room.messages, bots],
  );
  const nameOf = (entry: { bot: BotProfile | null }) =>
    entry.bot?.name ?? copy.removedBot;
  const speaking = bots.find((bot) => bot.id === room.speakingBotId);

  /** Not a <form>: React would bubble its submit to an outer form. */
  async function send() {
    if (!draft.trim() || room.sending) return;
    if (await room.post(draft, replyTo?.seq)) {
      setDraft("");
      setReplyTo(null);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send();
  }

  return (
    <div className="flex flex-col gap-4">
      {timeline.length === 0 ? (
        <p className="text-xs md:text-[13px] text-subtle">{copy.roomEmpty}</p>
      ) : (
        <ol className="flex flex-col gap-3" aria-live="polite">
          {timeline.map((entry) => (
            <li
              key={entry.seq}
              data-testid="group-message"
              className="group/msg flex gap-3"
            >
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
                  {entry.fromPerson ? copy.you : nameOf(entry)}
                  {entry.failed && (
                    <span className="font-normal text-danger">
                      {copy.failed}
                    </span>
                  )}
                </p>
                {entry.replyTo && (
                  <p className="line-clamp-2 border-s-2 border-border ps-2 text-xs text-muted md:text-[13px]">
                    {entry.replyTo.bot ? `${nameOf(entry.replyTo)}: ` : ""}
                    {entry.replyTo.text}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.55] text-foreground">
                  {entry.text}
                </p>
                {entry.room && (
                  <CrewRoomControl room={entry.room} language={language} />
                )}
                {entry.bot && (
                  <button
                    type="button"
                    onClick={() => setReplyTo(entry)}
                    aria-label={`${copy.reply}: ${nameOf(entry)}`}
                    className={`${SMALL_BUTTON} self-start px-0 text-muted hover:text-foreground`}
                  >
                    {copy.reply}
                  </button>
                )}
              </div>
            </li>
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
        <FormField label={copy.postLabel}>
          {(control) => (
            <textarea
              {...control}
              className={TEXTAREA_CLASS}
              value={draft}
              maxLength={MAX_CHANNEL_POST_LENGTH}
              placeholder={copy.postPlaceholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
            />
          )}
        </FormField>
        <button
          type="button"
          onClick={() => void send()}
          disabled={room.sending || !draft.trim()}
          className="min-h-11 self-end rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          {copy.send}
        </button>
      </div>
    </div>
  );
}
