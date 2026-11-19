"use client";

import { useState, type ReactNode } from "react";

interface BotEditDisclosureProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * A collapsed group of rarely used bot settings. Closed groups keep their
 * fields mounted, so typed values survive closing and reopening.
 */
export function BotEditDisclosure({
  title,
  defaultOpen = false,
  children,
}: BotEditDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group rounded-xl bg-surface"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-1.5 transition-colors hover:bg-surface-secondary [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 text-sm font-semibold text-foreground">
          {title}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="flex flex-col gap-3 px-3 pt-1 pb-3">{children}</div>
    </details>
  );
}
