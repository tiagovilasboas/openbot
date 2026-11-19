import type { ReactNode } from "react";
import { ChevronRightIcon } from "./FieldIcons.tsx";

interface DisclosureProps {
  summary: string;
  children: ReactNode;
  /** Starts open, e.g. when the hidden fields hold a custom value. */
  defaultOpen?: boolean;
}

/**
 * A collapsed section for rarely used settings ("Advanced"). Native
 * <details>, so it opens with the keyboard and needs no state.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen,
}: DisclosureProps) {
  return (
    <details open={defaultOpen} className="group flex flex-col">
      <summary className="-mx-1 flex min-h-10 w-fit cursor-pointer list-none items-center gap-1 rounded-lg px-1 text-sm font-medium text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-4 transition-transform group-open:rotate-90" />
        {summary}
      </summary>
      <div className="flex flex-col gap-3 pt-1.5">{children}</div>
    </details>
  );
}
