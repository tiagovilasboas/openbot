"use client";

import { AlertIcon } from "@/shared/ui/FieldIcons.tsx";
import { ModelChipIcon } from "../chat/ShellIcons.tsx";
import { useComposerModel } from "./composer-model-context.ts";

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0 opacity-70"
    >
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}

/** The active bot's model in the composer toolbar; press to change it. */
export function ComposerModelChip() {
  const control = useComposerModel();
  if (!control) return null;
  const { chip, onPress } = control;
  const warn = chip.tone === "warning";
  return (
    <button
      type="button"
      aria-label={chip.ariaLabel}
      title={chip.title}
      aria-haspopup="dialog"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPress}
      data-tone={chip.tone}
      className={`flex h-9 min-w-0 max-w-[8.5rem] items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-[background-color,border-color,color,transform] duration-(--duration-micro) ease-out-expo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 md:max-w-[16rem] ${
        warn
          ? "border-warning/40 bg-warning-soft text-warning hover:border-warning"
          : "border-border bg-surface-secondary text-muted hover:border-foreground/30 hover:bg-surface-tertiary hover:text-foreground"
      }`}
    >
      {warn ? (
        <AlertIcon className="size-3.5 shrink-0" />
      ) : (
        <ModelChipIcon className="size-3.5" />
      )}
      <span className="min-w-0 truncate">{chip.text}</span>
      <ChevronDownIcon />
    </button>
  );
}
