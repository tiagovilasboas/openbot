"use client";

import { ChevronRightIcon } from "@/shared/ui/FieldIcons.tsx";

interface ConnectionRowProps {
  name: string;
  description: string;
  isConnected: boolean;
  connectedLabel: string;
  connectLabel: string;
  onOpen: () => void;
}

/** One service: name, one line about it, and its status. Opens the detail. */
export function ConnectionRow({
  name,
  description,
  isConnected,
  connectedLabel,
  connectLabel,
  onOpen,
}: ConnectionRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-surface-secondary active:bg-surface-secondary"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {name}
          </span>
          <span className="block truncate text-[13px] text-subtle">
            {description}
          </span>
        </span>
        {isConnected ? (
          <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
            {connectedLabel}
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-border px-3 py-0.5 text-[13px] font-medium text-foreground">
            {connectLabel}
          </span>
        )}
        <ChevronRightIcon className="size-4 shrink-0 text-subtle" />
      </button>
    </li>
  );
}
