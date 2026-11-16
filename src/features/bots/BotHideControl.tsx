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
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2">
      <span className="min-w-0 text-[13px] text-muted">{copy.hideBotHint}</span>
      <button
        type="button"
        onClick={isHidden ? onRestore : onHide}
        className="min-h-11 shrink-0 rounded-full border border-border px-4 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm"
      >
        {isHidden ? copy.restoreBot : copy.hideBot}
      </button>
    </div>
  );
}
