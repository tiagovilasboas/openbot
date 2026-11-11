"use client";

import type { Language } from "../language/language.ts";
import { useState } from "react";
import { FormField, FIELD_CLASS } from "@/shared/ui/FormField.tsx";
import { MEMORY_MAX_ENTRY_LENGTH } from "./memory-entries.ts";
import { getMemoryCopy } from "./memory-copy.ts";
import { MemoryEntryRow } from "./MemoryEntryRow.tsx";
import { useBotMemory, useMemoryEnabled } from "./use-memory.ts";

interface MemorySectionProps {
  botId: string;
  language: Language;
}

function MemorySwitch({ language }: { language: Language }) {
  const copy = getMemoryCopy(language);
  const { enabled, setEnabled } = useMemoryEnabled();
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2">
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-foreground md:text-sm">
          {copy.switchLabel}
        </span>
        <span className="block text-[13px] text-muted">{copy.switchHint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={copy.switchLabel}
        onClick={() => setEnabled(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? "bg-foreground" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-background transition-transform ${enabled ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}

function ClearAllControl({
  language,
  onConfirm,
}: {
  language: Language;
  onConfirm: () => void;
}) {
  const copy = getMemoryCopy(language);
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 rounded-full px-4 text-[15px] font-medium text-danger transition-colors hover:bg-danger-soft active:scale-[0.97] md:text-sm"
      >
        {copy.clearAll}
      </button>
    );
  }
  return (
    <div role="alert" className="flex items-center gap-1">
      <span className="px-2 text-[15px] font-medium text-danger md:text-sm">
        {copy.clearConfirm}
      </span>
      <button
        type="button"
        onClick={() => {
          onConfirm();
          setConfirming(false);
        }}
        className="min-h-11 rounded-full bg-danger px-4 text-[15px] font-medium text-danger-foreground active:scale-[0.97] md:text-sm"
      >
        {copy.clearConfirmAction}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="min-h-11 rounded-full px-3 text-[15px] font-medium text-muted hover:bg-surface hover:text-foreground active:scale-[0.97] md:text-sm"
      >
        {copy.cancel}
      </button>
    </div>
  );
}

/**
 * The bot's memory, in the open: every note listed, each one editable and
 * deletable, plus the "use memory" switch. Changes save at once, apart from
 * the bot form's own Save button.
 */
export function MemorySection({ botId, language }: MemorySectionProps) {
  const copy = getMemoryCopy(language);
  const { entries, add, edit, remove, clear } = useBotMemory(botId);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const failure = add(text);
    setError(failure ? copy.errors[failure] : null);
    if (!failure) setText("");
  }

  return (
    <section aria-label={copy.title} className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">{copy.title}</h3>
        <p className="text-[13px] text-muted">{copy.deviceNote}</p>
      </div>

      <MemorySwitch language={language} />

      {entries.length === 0 ? (
        <p className="text-[13px] text-subtle">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map((entry) => (
            <MemoryEntryRow
              key={entry.id}
              entry={entry}
              language={language}
              onEdit={edit}
              onRemove={remove}
            />
          ))}
        </ul>
      )}

      <FormField
        label={copy.addLabel}
        helper={copy.counter(entries.length)}
        error={error}
      >
        {(control) => (
          <div className="flex items-center gap-2">
            <input
              {...control}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter adds the note; it must not submit the bot form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder={copy.addPlaceholder}
              maxLength={MEMORY_MAX_ENTRY_LENGTH}
              autoComplete="off"
              className={FIELD_CLASS}
            />
            <button
              type="button"
              onClick={handleAdd}
              className="min-h-11 shrink-0 rounded-full border border-border bg-surface px-4 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm"
            >
              {copy.addAction}
            </button>
          </div>
        )}
      </FormField>

      {entries.length > 0 && (
        <ClearAllControl language={language} onConfirm={clear} />
      )}
    </section>
  );
}
