"use client";

import { useId, useState } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { visibleBots } from "@/features/bots/bot-visibility.ts";
import type { Language } from "@/features/language/language.ts";
import { SidebarActionRow } from "@/features/chat/SidebarActionRow.tsx";
import { PlusIcon } from "@/features/chat/ShellIcons.tsx";
import { ResponsiveSheet } from "@/shared/ui/ResponsiveSheet.tsx";
import { emptyChannelDraft, type ChannelDraft } from "./channel-draft.ts";
import { ChannelForm } from "./ChannelForm.tsx";
import { ChannelRoom } from "./ChannelRoom.tsx";
import { getChannelsCopy } from "./channels-copy.ts";
import { useChannels } from "./use-channels.ts";

interface SidebarGroupsProps {
  language: Language;
  bots: BotProfile[];
  /** Organizes new groups when it is picked as a member. */
  mainBotId?: string;
}

function GroupGlyph() {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted"
    >
      #
    </span>
  );
}

/** The sidebar's groups: open one as a group chat, or start a new one. */
export function SidebarGroups({
  language,
  bots,
  mainBotId,
}: SidebarGroupsProps) {
  const copy = getChannelsCopy(language);
  const labelId = useId();
  const { state, save } = useChannels();
  const [creating, setCreating] = useState<ChannelDraft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const crew = visibleBots(bots);
  const groups = state.status === "ready" ? state.channels : [];
  const open = groups.find((group) => group.id === openId) ?? null;
  const firstId = mainBotId ?? crew[0]?.id;
  if (crew.length < 2) return null;

  async function create(draft: ChannelDraft) {
    const error = await save(draft);
    if (!error) {
      setCreating(null);
      setOpenId(draft.id);
    }
    return error;
  }

  return (
    <div role="group" aria-labelledby={labelId} className="mt-3 md:mt-5">
      <p
        id={labelId}
        className="px-3 pb-1 text-xs font-medium text-subtle md:pb-1.5"
      >
        {copy.title}
      </p>
      {groups.map((group) => (
        <SidebarActionRow
          key={group.id}
          icon={<GroupGlyph />}
          label={group.name}
          onPress={() => setOpenId(group.id)}
        />
      ))}
      {firstId && (
        <SidebarActionRow
          icon={
            <span className="flex size-8 items-center justify-center rounded-full border border-dashed border-border">
              <PlusIcon className="size-4" />
            </span>
          }
          label={copy.add}
          onPress={() => setCreating(emptyChannelDraft(firstId))}
        />
      )}

      <ResponsiveSheet
        isOpen={creating !== null}
        onClose={() => setCreating(null)}
        title={copy.add}
        description={copy.note}
        closeLabel={copy.close}
        size="md"
      >
        {creating && (
          <ChannelForm
            key={creating.id}
            initial={creating}
            bots={crew}
            language={language}
            onSave={create}
            onCancel={() => setCreating(null)}
          />
        )}
      </ResponsiveSheet>

      <ResponsiveSheet
        isOpen={open !== null}
        onClose={() => setOpenId(null)}
        title={open?.name ?? ""}
        description={open?.instructions || copy.note}
        closeLabel={copy.close}
        size="lg"
      >
        {open && <ChannelRoom channel={open} bots={bots} language={language} />}
      </ResponsiveSheet>
    </div>
  );
}
