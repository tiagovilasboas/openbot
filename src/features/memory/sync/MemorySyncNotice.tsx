"use client";

import type { Language } from "../../language/language.ts";
import { memorySyncMessage } from "./memory-sync-copy.ts";
import { useMemorySync } from "./use-memory-sync.ts";

const DISMISS: Record<Language, string> = {
  pt: "Fechar aviso",
  en: "Dismiss",
  es: "Cerrar aviso",
};

/**
 * Keeps the notes in step with the server for as long as it is mounted and
 * shows the last refusal worth reading; it renders nothing otherwise.
 */
export function MemorySyncNotice({ language }: { language: Language }) {
  const { syncError, dismissSyncError } = useMemorySync();
  if (!syncError) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2 text-[13px] text-danger"
    >
      <span>{memorySyncMessage(language, syncError)}</span>
      <button
        type="button"
        onClick={dismissSyncError}
        className="shrink-0 rounded px-2 py-1 text-muted hover:text-foreground"
      >
        {DISMISS[language]}
      </button>
    </div>
  );
}
