"use client";

import { useComposerModel } from "./composer-model-context.ts";

/** The active bot's model in the composer toolbar; press to change it. */
export function ComposerModelChip() {
  const control = useComposerModel();
  if (!control) return null;
  const { chip, onPress } = control;
  return (
    <button
      type="button"
      aria-label={chip.ariaLabel}
      title={chip.title}
      aria-haspopup="dialog"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPress}
      className={`flex h-11 min-w-0 max-w-[8.5rem] items-center rounded-full px-3 text-xs font-medium transition-[background-color,color,transform] duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary hover:text-foreground active:scale-[0.97] md:max-w-[16rem] ${
        chip.action === "connect"
          ? "bg-surface-secondary text-foreground"
          : "text-muted"
      }`}
    >
      <span className="truncate">{chip.text}</span>
    </button>
  );
}
