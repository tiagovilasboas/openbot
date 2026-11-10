"use client";

import { useState } from "react";
import { FIELD_CLASS } from "@/shared/ui/FormField.tsx";
import { MEMORY_MAX_ENTRY_LENGTH, type MemoryEntry } from "./memory-entries.ts";
import { getMemoryCopy } from "./memory-copy.ts";
import type { MemoryActionResult } from "./use-memory.ts";

const ROW_BUTTON =
  "min-h-11 shrink-0 rounded-full px-3 text-[15px] font-medium transition-colors active:scale-[0.97] md:text-sm";

interface MemoryEntryRowProps {
  entry: MemoryEntry;
  isPt: boolean;
  onEdit: (id: string, text: string) => MemoryActionResult;
  onRemove: (id: string) => void;
}

/** One note: its text with Edit and Delete, or an inline field to edit it. */
export function MemoryEntryRow({
  entry,
  isPt,
  onEdit,
  onRemove,
}: MemoryEntryRowProps) {
  const copy = getMemoryCopy(isPt);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (draft === null) return;
    const failure = onEdit(entry.id, draft);
    setError(failure ? copy.errors[failure] : null);
    if (!failure) setDraft(null);
  }

  if (draft === null) {
    return (
      <li className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-1.5">
        <span className="min-w-0 flex-1 break-words text-[15px] text-foreground md:text-sm">
          {entry.text}
        </span>
        <button
          type="button"
          onClick={() => setDraft(entry.text)}
          className={`${ROW_BUTTON} text-muted hover:bg-surface-secondary hover:text-foreground`}
        >
          {copy.edit}
        </button>
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className={`${ROW_BUTTON} text-danger hover:bg-danger-soft`}
        >
          {copy.remove}
        </button>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1.5 rounded-xl bg-surface px-3.5 py-2">
      <input
        aria-label={copy.editLabel}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
        maxLength={MEMORY_MAX_ENTRY_LENGTH}
        autoComplete="off"
        className={FIELD_CLASS}
      />
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setError(null);
          }}
          className={`${ROW_BUTTON} text-muted hover:bg-surface-secondary hover:text-foreground`}
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          onClick={save}
          className={`${ROW_BUTTON} bg-foreground text-background`}
        >
          {copy.save}
        </button>
      </div>
    </li>
  );
}
