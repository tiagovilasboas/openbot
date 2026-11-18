"use client";

import { useState } from "react";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { isDefaultThread, type Thread } from "./thread-model.ts";
import { displayTitle, getThreadCopy } from "./thread-copy.ts";

interface ThreadBarProps {
  language: ChatLanguage;
  threads: Thread[];
  activeId: string;
  /** A turn is running or queued: switching would misplace its reply. */
  locked: boolean;
  removed: Thread | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onUndoRemove: () => void;
}

const chip =
  "inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-[13px] font-medium transition-colors duration-(--duration-micro) ease-out-expo disabled:opacity-50";

/** The selected bot's threads: switch, add, rename and delete (with undo). */
export function ThreadBar({
  language,
  threads,
  activeId,
  locked,
  removed,
  onSelect,
  onCreate,
  onRename,
  onRemove,
  onUndoRemove,
}: ThreadBarProps) {
  const copy = getThreadCopy(language);
  const [editing, setEditing] = useState<string | null>(null);
  const active = threads.find((t) => t.id === activeId);

  return (
    <nav
      aria-label={copy.listLabel}
      className="flex items-center gap-1 overflow-x-auto border-b border-border px-3"
    >
      {threads.length > 1 &&
        threads.map((thread) =>
          editing === thread.id ? (
            <input
              key={thread.id}
              autoFocus
              aria-label={copy.renameLabel}
              defaultValue={thread.title ?? ""}
              onBlur={(e) => {
                onRename(thread.id, e.currentTarget.value);
                setEditing(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditing(null);
              }}
              className="min-h-11 w-40 shrink-0 rounded-full border border-border bg-surface px-3 text-[13px]"
            />
          ) : (
            <button
              key={thread.id}
              type="button"
              disabled={locked && thread.id !== activeId}
              title={locked ? copy.busy : undefined}
              aria-current={thread.id === activeId ? "true" : undefined}
              onClick={() => onSelect(thread.id)}
              className={`${chip} ${
                thread.id === activeId
                  ? "bg-surface-secondary text-foreground"
                  : "text-muted hover:bg-surface"
              }`}
            >
              {displayTitle(thread, copy)}
            </button>
          ),
        )}
      {active && !isDefaultThread(active.id) && editing === null && (
        <>
          <button
            type="button"
            onClick={() => setEditing(active.id)}
            className={`${chip} text-muted hover:bg-surface`}
          >
            {copy.rename}
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => onRemove(active.id)}
            className={`${chip} text-muted hover:bg-surface`}
          >
            {copy.remove}
          </button>
        </>
      )}
      <button
        type="button"
        disabled={locked}
        title={locked ? copy.busy : undefined}
        onClick={onCreate}
        className={`${chip} text-muted hover:bg-surface`}
      >
        + {copy.newThread}
      </button>
      {removed && (
        <span
          role="status"
          className="ml-2 flex items-center text-[13px] text-muted"
        >
          {copy.removed}
          <button
            type="button"
            onClick={onUndoRemove}
            className={`${chip} font-semibold text-foreground hover:bg-surface`}
          >
            {copy.undo}
          </button>
        </span>
      )}
    </nav>
  );
}
