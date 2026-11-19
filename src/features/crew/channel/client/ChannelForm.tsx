"use client";

import { useState } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { Language } from "@/features/language/language.ts";
import {
  FIELD_CLASS,
  FormField,
  TEXTAREA_CLASS,
} from "@/shared/ui/FormField.tsx";
import {
  MAX_CHANNEL_INSTRUCTIONS_LENGTH,
  MAX_CHANNEL_MEMBERS,
  MAX_CHANNEL_NAME_LENGTH,
} from "../crew-channel.ts";
import {
  canAddMember,
  channelDraftProblem,
  setLeader,
  toggleMember,
  type ChannelDraft,
} from "./channel-draft.ts";
import { channelErrorText, getChannelsCopy } from "./channels-copy.ts";

interface ChannelFormProps {
  initial: ChannelDraft;
  bots: BotProfile[];
  language: Language;
  /** Resolves to the server's error code, or null when saved. */
  onSave: (draft: ChannelDraft) => Promise<string | null>;
  onCancel: () => void;
}

const BUTTON =
  "min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors active:scale-[0.97]";

/** Name, members, leader and instructions of one channel. */
export function ChannelForm({
  initial,
  bots,
  language,
  onSave,
  onCancel,
}: ChannelFormProps) {
  const copy = getChannelsCopy(language);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const members = bots.filter((bot) => draft.memberBotIds.includes(bot.id));

  /** Not a <form>: it sits inside the bot editor's form. */
  async function submit() {
    const problem = channelDraftProblem(draft);
    if (problem) return setError(problem);
    setSaving(true);
    const failed = await onSave(draft);
    setSaving(false);
    setError(failed);
  }

  return (
    <div
      role="group"
      aria-label={copy.title}
      className="flex flex-col gap-3 rounded-xl border border-border bg-overlay p-3"
    >
      <FormField label={copy.nameLabel}>
        {(control) => (
          <input
            {...control}
            className={FIELD_CLASS}
            value={draft.name}
            maxLength={MAX_CHANNEL_NAME_LENGTH}
            placeholder={copy.namePlaceholder}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        )}
      </FormField>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-foreground">
          {copy.membersLabel}
          <span className="ms-1.5 text-xs font-normal text-muted md:text-[13px]">
            {copy.membersHelper(MAX_CHANNEL_MEMBERS)}
          </span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {bots.map((bot) => {
            const checked = draft.memberBotIds.includes(bot.id);
            return (
              <label
                key={bot.id}
                className="flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && !canAddMember(draft)}
                  onChange={() => setDraft(toggleMember(draft, bot.id))}
                />
                {bot.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      <FormField label={copy.leaderLabel}>
        {(control) => (
          <select
            {...control}
            className={FIELD_CLASS}
            value={draft.leaderBotId}
            onChange={(e) => setDraft(setLeader(draft, e.target.value))}
          >
            {members.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label={copy.instructionsLabel}>
        {(control) => (
          <textarea
            {...control}
            className={TEXTAREA_CLASS}
            value={draft.instructions}
            maxLength={MAX_CHANNEL_INSTRUCTIONS_LENGTH}
            placeholder={copy.instructionsPlaceholder}
            onChange={(e) =>
              setDraft({ ...draft, instructions: e.target.value })
            }
          />
        )}
      </FormField>

      {error && (
        <p role="alert" className="text-xs md:text-[13px] text-danger">
          {channelErrorText(copy, error)}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className={`${BUTTON} bg-foreground text-background disabled:opacity-50`}
        >
          {copy.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${BUTTON} border border-border bg-surface text-foreground hover:bg-surface-secondary`}
        >
          {copy.cancel}
        </button>
      </div>
    </div>
  );
}
