"use client";

import { useState } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { visibleBots } from "@/features/bots/bot-visibility.ts";
import type { Language } from "@/features/language/language.ts";
import { ResponsiveSheet } from "@/shared/ui/ResponsiveSheet.tsx";
import type { CrewChannel } from "../crew-channel.ts";
import { emptyChannelDraft, type ChannelDraft } from "./channel-draft.ts";
import { ChannelForm } from "./ChannelForm.tsx";
import { ChannelRoom } from "./ChannelRoom.tsx";
import { getChannelsCopy } from "./channels-copy.ts";
import { useChannels } from "./use-channels.ts";

interface ChannelsSectionProps {
  /** The main bot, which leads new channels by default. */
  leaderBotId: string;
  bots: BotProfile[];
  language: Language;
}

const ROW_BUTTON =
  "min-h-11 rounded-full px-3 text-[13px] font-medium text-foreground hover:bg-surface-secondary";

/** The crew's stored channels: list, create, edit, delete and open. */
export function ChannelsSection({
  leaderBotId,
  bots,
  language,
}: ChannelsSectionProps) {
  const copy = getChannelsCopy(language);
  const { state, save, remove } = useChannels();
  const [editing, setEditing] = useState<ChannelDraft | null>(null);
  const [open, setOpen] = useState<CrewChannel | null>(null);
  const crew = visibleBots(bots);

  async function handleSave(draft: ChannelDraft) {
    const error = await save(draft);
    if (!error) setEditing(null);
    return error;
  }

  return (
    <section aria-label={copy.title} className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">{copy.title}</h3>
        <p className="text-[13px] text-muted">{copy.note}</p>
      </div>
      {state.status === "failed" && (
        <p role="alert" className="text-[13px] text-danger">
          {copy.errors.load}
        </p>
      )}
      {state.status === "ready" && state.channels.length === 0 && !editing && (
        <p className="text-[13px] text-subtle">{copy.empty}</p>
      )}
      {state.status === "ready" && state.channels.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {state.channels.map((channel) => (
            <li
              key={channel.id}
              className="flex flex-wrap items-center gap-1 rounded-xl border border-border px-3 py-1"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {channel.name}
              </span>
              <button
                type="button"
                className={ROW_BUTTON}
                onClick={() => setOpen(channel)}
              >
                {copy.open}
              </button>
              <button
                type="button"
                className={ROW_BUTTON}
                onClick={() => setEditing(channel)}
              >
                {copy.edit}
              </button>
              <button
                type="button"
                className={ROW_BUTTON}
                onClick={() => {
                  if (window.confirm(copy.removeConfirm))
                    void remove(channel.id);
                }}
              >
                {copy.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <ChannelForm
          key={editing.id}
          initial={editing}
          bots={crew}
          language={language}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        state.status === "ready" && (
          <button
            type="button"
            onClick={() => setEditing(emptyChannelDraft(leaderBotId))}
            className="min-h-11 self-start rounded-full border border-border bg-surface px-4 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm"
          >
            {copy.add}
          </button>
        )
      )}

      <ResponsiveSheet
        isOpen={open !== null}
        onClose={() => setOpen(null)}
        title={open?.name ?? ""}
        description={open?.instructions || copy.note}
        closeLabel={copy.close}
        size="md"
      >
        {open && <ChannelRoom channel={open} bots={bots} language={language} />}
      </ResponsiveSheet>
    </section>
  );
}
