"use client";

import type { Language } from "../language/language.ts";
import { getBotsCopy } from "./bots-copy.ts";

interface BotHideControlProps {
  language: Language;
  isHidden: boolean;
  onHide: () => void;
  onRestore: () => void;
}

/** Hides the bot from the sidebar list and @ mentions, or brings it back. */
export function BotHideControl({
  language,
  isHidden,
  onHide,
  onRestore,
}: BotHideControlProps) {
  const copy = getBotsCopy(language);
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 py-1.5">
      <span className="min-w-0 text-xs md:text-[13px] text-muted">
        {copy.hideBotHint}
      </span>
      <button
        type="button"
        onClick={isHidden ? onRestore : onHide}
        className="min-h-9 shrink-0 whitespace-nowrap rounded-full border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97]"
      >
        {isHidden ? copy.restoreBot : copy.hideBot}
      </button>
    </div>
  );
}
