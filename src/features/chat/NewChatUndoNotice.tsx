"use client";

import type { Language } from "../language/language.ts";
import { getNewChatUndoCopy } from "./new-chat-undo-copy.ts";

interface NewChatUndoNoticeProps {
  language: Language;
  visible: boolean;
  onUndo: () => void;
}

/** Tells the thread was cleared and offers "Undo" until the window ends. */
export function NewChatUndoNotice({
  language,
  visible,
  onUndo,
}: NewChatUndoNoticeProps) {
  const copy = getNewChatUndoCopy(language);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(var(--safe-bottom),1rem)] z-50 flex justify-center px-4"
    >
      {visible && (
        <div className="pointer-events-auto flex animate-enter items-center gap-1 rounded-full border border-border bg-surface py-0.5 pr-0.5 pl-4 shadow-lg motion-reduce:animate-none">
          <span className="text-sm text-foreground">{copy.cleared}</span>
          <button
            type="button"
            onClick={onUndo}
            className="min-h-11 rounded-full px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97]"
          >
            {copy.undo}
          </button>
        </div>
      )}
    </div>
  );
}
