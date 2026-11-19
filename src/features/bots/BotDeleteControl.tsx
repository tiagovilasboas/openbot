"use client";

import type { Language } from "../language/language.ts";
import { useState } from "react";
import { getBotsCopy } from "./bots-copy.ts";

interface BotDeleteControlProps {
  language: Language;
  onConfirm: () => void;
}

/** Two-step delete: ghost trigger, then inline "Delete? Confirm / Cancel". */
export function BotDeleteControl({
  language,
  onConfirm,
}: BotDeleteControlProps) {
  const copy = getBotsCopy(language);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 rounded-full px-4 text-sm font-medium text-danger transition-colors hover:bg-danger-soft active:scale-[0.97]"
      >
        {copy.deleteBot}
      </button>
    );
  }

  return (
    <div role="alert" className="flex items-center gap-1">
      <span className="px-2 text-sm font-medium text-danger">
        {copy.deleteConfirm}
      </span>
      <button
        type="button"
        onClick={onConfirm}
        className="min-h-11 rounded-full bg-danger px-4 text-sm font-medium text-danger-foreground active:scale-[0.97]"
      >
        {copy.deleteConfirmAction}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="min-h-11 rounded-full px-3 text-sm font-medium text-muted hover:bg-surface hover:text-foreground active:scale-[0.97]"
      >
        {copy.cancel}
      </button>
    </div>
  );
}
