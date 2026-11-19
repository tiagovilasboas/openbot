"use client";

import { useState } from "react";

interface UsageResetControlProps {
  /** The button that opens the question, and its accessible name. */
  label: string;
  /** Shorter visible text, when the label is too long for its row. */
  text?: string;
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
  text,
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
        className="min-h-10 shrink-0 whitespace-nowrap rounded-full px-3 text-sm font-medium text-danger transition-colors hover:bg-danger-soft active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
      >
        {text ?? label}
      </button>
    );
  }
  return (
    <div role="alert" className="flex flex-wrap items-center gap-1">
      <span className="px-2 text-sm font-medium text-danger">{question}</span>
      <button
        type="button"
        onClick={() => {
          onConfirm();
          setConfirming(false);
        }}
        className="min-h-10 rounded-full bg-danger px-4 text-sm font-medium text-danger-foreground active:scale-[0.97]"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="min-h-10 rounded-full px-3 text-sm font-medium text-muted hover:bg-surface hover:text-foreground active:scale-[0.97]"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
