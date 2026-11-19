"use client";

import { ChevronRightIcon } from "@/shared/ui/FieldIcons.tsx";
import type { ProviderState } from "../switch/provider-switch.ts";

interface ConnectionRowProps {
  name: string;
  description: string;
  state: ProviderState;
  /** The words for each state, from the connections copy. */
  labels: Record<ProviderState, string>;
  onOpen: () => void;
}

/** One service: name, one line about it, and its status. Opens the detail. */
export function ConnectionRow({
  name,
  description,
  state,
  labels,
  onOpen,
}: ConnectionRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 w-full items-center gap-3 px-3 py-1.5 text-left transition-colors hover:bg-surface-secondary active:bg-surface-secondary md:min-h-14 md:px-3.5 md:py-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {name}
          </span>
          <span className="block truncate text-xs text-subtle md:text-[13px]">
            {description}
          </span>
        </span>
        {state === "notConfigured" ? (
          <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground md:px-3 md:text-[13px]">
            {labels.notConfigured}
          </span>
        ) : (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              state === "off"
                ? "bg-surface-secondary text-subtle"
                : "bg-success-soft text-success"
            }`}
          >
            {labels[state]}
          </span>
        )}
        <ChevronRightIcon className="size-4 shrink-0 text-subtle" />
      </button>
    </li>
  );
}
