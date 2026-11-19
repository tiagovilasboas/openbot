"use client";

import { useState } from "react";
import type { Language } from "../../language/language.ts";
import {
  draftFromRoutine,
  emptyDraft,
  type RoutineDraft,
} from "./routine-draft.ts";
import { RoutineForm } from "./RoutineForm.tsx";
import { RoutineRow } from "./RoutineRow.tsx";
import { getRoutinesCopy } from "./routines-copy.ts";
import { useRoutines } from "./use-routines.ts";

interface RoutinesSectionProps {
  botId: string;
  language: Language;
}

/** The routines of a saved bot: list, create, edit, pause, run, history. */
export function RoutinesSection({ botId, language }: RoutinesSectionProps) {
  const copy = getRoutinesCopy(language);
  const { state, runningIds, save, remove, runNow } = useRoutines(botId);
  const [editing, setEditing] = useState<RoutineDraft | null>(null);

  async function handleSave(...args: Parameters<typeof save>) {
    const ok = await save(...args);
    if (ok) setEditing(null);
    return ok;
  }

  return (
    <section aria-label={copy.title} className="flex flex-col gap-2">
      <p className="text-xs text-muted md:text-[13px]">{copy.note}</p>

      {state.status === "failed" && (
        <p role="alert" className="text-xs md:text-[13px] text-danger">
          {copy.errors.load}
        </p>
      )}
      {state.status === "ready" && state.routines.length === 0 && !editing && (
        <p className="text-xs md:text-[13px] text-subtle">{copy.empty}</p>
      )}
      {state.status === "ready" && state.routines.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {state.routines.map((routine) => (
            <RoutineRow
              key={routine.id}
              routine={routine}
              language={language}
              running={runningIds.has(routine.id)}
              onEdit={() => setEditing(draftFromRoutine(routine))}
              onToggle={() => save({ ...routine, enabled: !routine.enabled })}
              onRemove={() => remove(routine.id)}
              onRunNow={() => runNow(routine.id)}
            />
          ))}
        </ul>
      )}

      {editing ? (
        <RoutineForm
          key={editing.id}
          botId={botId}
          initial={editing}
          language={language}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        state.status === "ready" && (
          <button
            type="button"
            onClick={() => setEditing(emptyDraft())}
            className="min-h-10 self-start rounded-full border border-border bg-overlay px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97]"
          >
            {copy.add}
          </button>
        )
      )}
    </section>
  );
}
