"use client";

import { useId } from "react";
import type { Language } from "@/features/language/language.ts";
import { toolsCopy } from "./tools-copy.ts";

/**
 * The bot editor's opt-in for tools, with what it allows in one line. The
 * whole row is the switch, so the target is as tall as the row.
 */
export function BotToolsToggle({
  enabled,
  language,
  onChange,
}: {
  enabled: boolean;
  language: Language;
  onChange: (enabled: boolean) => void;
}) {
  const copy = toolsCopy[language];
  const labelId = useId();
  const hintId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-labelledby={labelId}
      aria-describedby={hintId}
      onClick={() => onChange(!enabled)}
      className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2 text-left"
    >
      <span className="min-w-0">
        <span
          id={labelId}
          className="block text-[15px] font-medium text-foreground md:text-sm"
        >
          {copy.toggleLabel}
        </span>
        <span id={hintId} className="block text-[13px] text-muted">
          {copy.toggleHint}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? "bg-foreground" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-background transition-transform ${enabled ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}
