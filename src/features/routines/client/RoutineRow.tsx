"use client";

import { useState } from "react";
import type { Language } from "../../language/language.ts";
import type { SavedRoutine } from "./routines-api.ts";
import { formatWhen, scheduleSummary } from "./routine-format.ts";
import { RoutineRunsList } from "./RoutineRunsList.tsx";
import { getRoutinesCopy } from "./routines-copy.ts";

interface RoutineRowProps {
  routine: SavedRoutine;
  language: Language;
  running: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onRunNow: () => Promise<boolean>;
}

const ACTION =
  "min-h-9 rounded-full px-3 text-xs md:text-[13px] font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground disabled:opacity-50";

/** One routine: when it runs, its switch, actions and run history. */
export function RoutineRow(props: RoutineRowProps) {
  const { routine, language, running, onEdit, onToggle, onRemove } = props;
  const copy = getRoutinesCopy(language);
  const [showHistory, setShowHistory] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [runError, setRunError] = useState(false);
  const [version, setVersion] = useState(0);

  async function handleRunNow() {
    const ok = await props.onRunNow();
    setRunError(!ok);
    setShowHistory(true);
    setVersion((v) => v + 1);
  }

  const when = routine.enabled
    ? routine.nextRunAt !== null
      ? copy.nextRun(formatWhen(routine.nextRunAt, language))
      : ""
    : copy.paused;

  return (
    <li className="flex flex-col gap-1 rounded-xl border border-border px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {routine.title}
          </p>
          <p className="text-xs md:text-[13px] text-muted">
            {scheduleSummary(routine.schedule, copy, language)}
            {when && ` · ${when}`}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={routine.enabled}
          aria-label={`${copy.enabledLabel}: ${routine.title}`}
          onClick={onToggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${routine.enabled ? "bg-foreground" : "bg-border"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-background transition-transform ${routine.enabled ? "translate-x-5" : ""}`}
          />
        </button>
      </div>

      <div className="-mx-1 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={handleRunNow}
          disabled={running}
          className={ACTION}
        >
          {running ? copy.running : copy.runNow}
        </button>
        <button type="button" onClick={onEdit} className={ACTION}>
          {copy.edit}
        </button>
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          aria-expanded={showHistory}
          className={ACTION}
        >
          {showHistory ? copy.hideHistory : copy.history}
        </button>
        <button
          type="button"
          onClick={() => (confirming ? onRemove() : setConfirming(true))}
          onBlur={() => setConfirming(false)}
          className={`${ACTION} ${confirming ? "text-danger" : ""}`}
        >
          {confirming ? copy.removeConfirm : copy.remove}
        </button>
      </div>

      {runError && (
        <p role="alert" className="text-xs md:text-[13px] text-danger">
          {copy.errors.run}
        </p>
      )}
      {showHistory && (
        <RoutineRunsList
          routineId={routine.id}
          language={language}
          version={version}
        />
      )}
    </li>
  );
}
