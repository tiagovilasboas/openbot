"use client";

import { useState } from "react";

interface UsageResetControlProps {
  /** The button that opens the question, and its accessible name. */
  label: string;
  /** The question asked before anything is erased. */
  question: string;
  confirmLabel: string;
  cancelLabel: string;
  disabled?: boolean;
  onConfirm: () => void;
}

/** A destructive action behind one confirmation, like the memory "clear all". */
export function UsageResetControl({
  label,
  question,
  confirmLabel,
  cancelLabel,
  disabled,
  onConfirm,
}: UsageResetControlProps) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        onClick={() => setConfirming(true)}
        className="min-h-11 rounded-full px-4 text-[15px] font-medium text-danger transition-colors hover:bg-danger-soft active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:text-sm"
      >
        {label}
      </button>
    );
  }
  return (
    <div role="alert" className="flex flex-wrap items-center gap-1">
      <span className="px-2 text-[15px] font-medium text-danger md:text-sm">
        {question}
      </span>
      <button
        type="button"
        onClick={() => {
          onConfirm();
          setConfirming(false);
        }}
        className="min-h-11 rounded-full bg-danger px-4 text-[15px] font-medium text-danger-foreground active:scale-[0.97] md:text-sm"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="min-h-11 rounded-full px-3 text-[15px] font-medium text-muted hover:bg-surface hover:text-foreground active:scale-[0.97] md:text-sm"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
