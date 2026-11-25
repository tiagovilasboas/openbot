"use client";

import { useState, type KeyboardEvent } from "react";
import { FormField, TEXTAREA_CLASS } from "@/shared/ui/FormField.tsx";
import { MAX_CHANNEL_POST_LENGTH } from "../channel-message.ts";

interface ChannelComposerProps {
  label: string;
  placeholder: string;
  sendLabel: string;
  sending: boolean;
  /** Posts the draft; true when it went through, which clears the box. */
  onSend: (text: string) => Promise<boolean>;
}

/** The box a person writes a post in, for the room and for a thread. */
export function ChannelComposer({
  label,
  placeholder,
  sendLabel,
  sending,
  onSend,
}: ChannelComposerProps) {
  const [draft, setDraft] = useState("");

  /** Not a <form>: React would bubble its submit to an outer form. */
  async function send() {
    if (!draft.trim() || sending) return;
    if (await onSend(draft)) setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send();
  }

  return (
    <>
      <FormField label={label}>
        {(control) => (
          <textarea
            {...control}
            className={TEXTAREA_CLASS}
            value={draft}
            maxLength={MAX_CHANNEL_POST_LENGTH}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
        )}
      </FormField>
      <button
        type="button"
        onClick={() => void send()}
        disabled={sending || !draft.trim()}
        className="min-h-11 self-end rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
      >
        {sendLabel}
      </button>
    </>
  );
}
