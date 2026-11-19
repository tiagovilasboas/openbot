"use client";

import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { SheetFooter } from "@/shared/ui/ResponsiveSheet.tsx";
import { BotDeleteControl } from "./BotDeleteControl.tsx";
import { getBotsCopy } from "./bots-copy.ts";

interface BotEditFooterProps {
  language: ChatLanguage;
  /** Shown only when this bot may be deleted. */
  onDelete?: () => void;
  isValid: boolean;
  onClose: () => void;
  onSave: () => void;
}

/** The sheet footer: delete on the left, cancel and save on the right. */
export function BotEditFooter({
  language,
  onDelete,
  isValid,
  onClose,
  onSave,
}: BotEditFooterProps) {
  const copy = getBotsCopy(language);
  return (
    <SheetFooter>
      <div className="flex items-center justify-between gap-2">
        <div>
          {onDelete && (
            <BotDeleteControl language={language} onConfirm={onDelete} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97]"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            disabled={!isValid}
            onClick={onSave}
            className="min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-transform active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            {copy.save}
          </button>
        </div>
      </div>
    </SheetFooter>
  );
}
