"use client";

import { useState } from "react";
import { getBotsCopy } from "./bots-copy.ts";

interface BotDeleteControlProps {
  isPt: boolean;
  onConfirm: () => void;
}

/** Two-step delete: ghost trigger, then inline "Delete? Confirm / Cancel". */
export function BotDeleteControl({ isPt, onConfirm }: BotDeleteControlProps) {
  const copy = getBotsCopy(isPt);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 rounded-full px-4 text-[15px] font-medium text-danger transition-colors hover:bg-danger-soft active:scale-[0.97] md:text-sm"
      >
        {copy.deleteBot}
      </button>
    );
  }

  return (
    <div role="alert" className="flex items-center gap-1">
      <span className="px-2 text-[15px] font-medium text-danger md:text-sm">
        {copy.deleteConfirm}
      </span>
      <button
        type="button"
        onClick={onConfirm}
        className="min-h-11 rounded-full bg-danger px-4 text-[15px] font-medium text-danger-foreground active:scale-[0.97] md:text-sm"
      >
        {copy.deleteConfirmAction}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="min-h-11 rounded-full px-3 text-[15px] font-medium text-muted hover:bg-surface hover:text-foreground active:scale-[0.97] md:text-sm"
      >
        {copy.cancel}
      </button>
    </div>
  );
}
