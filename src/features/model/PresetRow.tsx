"use client";

import { CheckIcon } from "@/shared/ui/FieldIcons.tsx";

interface PresetRowProps {
  name: string;
  description: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
}

/** One selectable row: name, one-line description, optional badge, check. */
export function PresetRow({
  name,
  description,
  badge,
  selected,
  onSelect,
}: PresetRowProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-1.5 text-start transition-colors active:scale-[0.99] ${
        selected
          ? "bg-surface-tertiary"
          : "bg-surface hover:bg-surface-secondary"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-foreground">
          {name}
        </span>
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted">
          {description}
        </span>
      </span>
      {badge && (
        <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
          {badge}
        </span>
      )}
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
          selected ? "bg-bot-accent text-background" : "border border-border"
        }`}
      >
        {selected && <CheckIcon className="size-3.5" />}
      </span>
    </button>
  );
}
