"use client";

import type { Language } from "../language/language.ts";
import { getBotsCopy } from "./bots-copy.ts";

interface BotDeletionNoticeProps {
  language: Language;
  /** The bot waiting out its undo window; none hides the notice. */
  botName: string | null;
  onUndo: () => void;
}

/** Tells a bot was deleted and offers "Undo" until the window ends. */
export function BotDeletionNotice({
  language,
  botName,
  onUndo,
}: BotDeletionNoticeProps) {
  const copy = getBotsCopy(language);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(var(--safe-bottom),1rem)] z-50 flex justify-center px-4"
    >
      {botName !== null && (
        <div className="pointer-events-auto flex animate-enter items-center gap-1 rounded-full border border-border bg-surface py-1 pr-1 pl-5 shadow-lg motion-reduce:animate-none">
          <span className="text-[15px] text-foreground md:text-sm">
            {copy.deletedNotice.replace("{bot}", botName)}
          </span>
          <button
            type="button"
            onClick={onUndo}
            className="min-h-11 rounded-full px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm"
          >
            {copy.undoDelete}
          </button>
        </div>
      )}
    </div>
  );
}
