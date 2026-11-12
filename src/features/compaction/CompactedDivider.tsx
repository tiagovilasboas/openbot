"use client";

import { useId, useState } from "react";
import type { MessageData } from "../chat/ChatMessageItem.tsx";
import { compactionCopy } from "./compaction-copy.ts";

/**
 * Marks where the earlier history was folded into a summary. The archived
 * messages open on demand, read-only, and are never sent to the model.
 */
export function CompactedDivider({ message }: { message: MessageData }) {
  const [open, setOpen] = useState(false);
  const archiveId = useId();
  const compacted = message.compacted;
  const content = compactionCopy[message.language];
  if (!compacted) return null;

  return (
    <div className="flex w-full flex-col gap-2 text-[13px] text-muted animate-enter">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <span className="text-center font-medium">
          {content.divider(compacted.originalCount)}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={archiveId}
        onClick={() => setOpen((value) => !value)}
        className="min-h-11 self-center rounded-full border border-border bg-surface px-4 font-medium text-foreground transition-colors duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary"
      >
        {open ? content.hide : content.show}
      </button>
      <ol
        id={archiveId}
        hidden={!open}
        aria-label={content.archiveLabel}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3"
      >
        {compacted.archived.map((archived) => (
          <li key={archived.id} className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-subtle">
              {archived.role === "user" ? content.you : content.bot}
            </span>
            <p className="whitespace-pre-wrap break-words text-foreground">
              {archived.text}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
