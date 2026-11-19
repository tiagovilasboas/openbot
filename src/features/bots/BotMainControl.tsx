"use client";

import type { Language } from "../language/language.ts";
import { getBotsCopy } from "./bots-copy.ts";

interface BotMainControlProps {
  language: Language;
  isMain: boolean;
  onMakeMain: () => void;
}

/**
 * The main bot leads the crew as the Chief. This row says so, or lets the
 * user hand that role to the bot being edited.
 */
export function BotMainControl({
  language,
  isMain,
  onMakeMain,
}: BotMainControlProps) {
  const copy = getBotsCopy(language);
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {copy.mainBot}
        </span>
        <span className="block text-xs md:text-[13px] text-muted">
          {copy.mainBotHint}
        </span>
      </span>
      {isMain ? (
        <span
          role="status"
          className="shrink-0 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success"
        >
          {copy.mainBot}
        </span>
      ) : (
        <button
          type="button"
          onClick={onMakeMain}
          className="min-h-9 shrink-0 whitespace-nowrap rounded-full border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97]"
        >
          {copy.makeMain}
        </button>
      )}
    </div>
  );
}
