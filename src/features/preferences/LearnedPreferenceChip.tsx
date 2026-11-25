"use client";

import { useState } from "react";
import type { Language } from "../language/language.ts";
import { useBotMemory, useMemoryEnabled } from "../memory/use-memory.ts";
import { preferenceCopy } from "./preference-copy.ts";
import { preferenceOffer } from "./preference-offer.ts";

interface Props {
  botId: string;
  language: Language;
  turns: readonly { id: number; role: "assistant" | "user"; text: string }[];
}

const BUTTON =
  "min-h-11 rounded-full border border-border bg-surface px-4 font-medium text-foreground transition-colors duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary";

/**
 * Offers to keep a stated preference in the bot's memory. Nothing is written
 * until Save is pressed; "Not now" hides the offer for that reply.
 */
export function LearnedPreferenceChip({ botId, language, turns }: Props) {
  const { entries, add } = useBotMemory(botId);
  const { enabled } = useMemoryEnabled();
  const [hidden, setHidden] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const offer = enabled ? preferenceOffer(turns, entries) : null;
  const content = preferenceCopy[language];
  if (!offer || hidden === offer.replyId) return null;

  return (
    <div
      role="group"
      aria-label={content.prompt}
      className="flex flex-wrap items-center gap-2 text-[13px] text-muted"
    >
      <span>{failed ? content.failed : content.prompt}</span>
      {!failed && (
        <button
          type="button"
          className={BUTTON}
          onClick={() => setFailed(add(offer.text) !== null)}
        >
          {content.save}
        </button>
      )}
      <button
        type="button"
        className={BUTTON}
        onClick={() => setHidden(offer.replyId)}
      >
        {content.dismiss}
      </button>
    </div>
  );
}
