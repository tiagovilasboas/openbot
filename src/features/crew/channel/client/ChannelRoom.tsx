"use client";

import { useMemo, useState } from "react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { Language } from "@/features/language/language.ts";
import { CrewRoomControl } from "@/features/crew/CrewRoomControl.tsx";
import { FormField, TEXTAREA_CLASS } from "@/shared/ui/FormField.tsx";
import { MAX_CHANNEL_POST_LENGTH } from "../channel-message.ts";
import type { CrewChannel } from "../crew-channel.ts";
import { buildChannelTimeline } from "./channel-timeline.ts";
import { channelErrorText, getChannelsCopy } from "./channels-copy.ts";
import { useChannelRoom } from "./use-channel-room.ts";

interface ChannelRoomProps {
  channel: CrewChannel;
  bots: BotProfile[];
  language: Language;
}

/** A channel opened as the room: its messages in order and a composer. */
export function ChannelRoom({ channel, bots, language }: ChannelRoomProps) {
  const copy = getChannelsCopy(language);
  const { messages, error, busy, post } = useChannelRoom(channel.id);
  const [draft, setDraft] = useState("");
  const timeline = useMemo(
    () => buildChannelTimeline(messages, bots),
    [messages, bots],
  );

  /** Not a <form>: React would bubble its submit to the bot editor's form. */
  async function send() {
    if (!draft.trim() || busy) return;
    if (await post(draft)) setDraft("");
  }

  return (
    <div className="flex flex-col gap-4">
      {timeline.length === 0 ? (
        <p className="text-xs md:text-[13px] text-subtle">{copy.roomEmpty}</p>
      ) : (
        <ol className="flex flex-col gap-3" aria-live="polite">
          {timeline.map((entry) => (
            <li key={entry.seq} className="flex gap-3">
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
                <p className="text-xs md:text-[13px] font-semibold text-foreground">
                  {entry.fromPerson
                    ? copy.you
                    : (entry.bot?.name ?? copy.removedBot)}
                </p>
                <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.55] text-foreground">
                  {entry.text}
                </p>
                {entry.room && (
                  <CrewRoomControl room={entry.room} language={language} />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {busy && (
        <p role="status" className="text-xs md:text-[13px] text-muted">
          {copy.working}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs md:text-[13px] text-danger">
          {channelErrorText(copy, error)}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <FormField label={copy.postLabel}>
          {(control) => (
            <textarea
              {...control}
              className={TEXTAREA_CLASS}
              value={draft}
              maxLength={MAX_CHANNEL_POST_LENGTH}
              placeholder={copy.postPlaceholder}
              onChange={(e) => setDraft(e.target.value)}
            />
          )}
        </FormField>
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !draft.trim()}
          className="min-h-11 self-end rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          {copy.send}
        </button>
      </div>
    </div>
  );
}
