"use client";

import { useEffect, useState } from "react";
import type { Language } from "../../language/language.ts";
import { fetchRuns, type RoutineRun } from "./routines-api.ts";
import { formatWhen } from "./routine-format.ts";
import { getRoutinesCopy, type RoutinesCopy } from "./routines-copy.ts";

interface RoutineRunsListProps {
  routineId: string;
  language: Language;
  /** Changes after each run so the list loads again. */
  version: number;
}

function runLabel(run: RoutineRun, copy: RoutinesCopy): string {
  if (run.status === "running") return copy.running;
  if (run.status === "failed") return copy.failed(run.reason ?? "?");
  return run.nothingNew ? copy.nothingNew : "";
}

/** The latest runs of a routine, newest first, with their replies. */
export function RoutineRunsList(props: RoutineRunsListProps) {
  const { routineId, language, version } = props;
  const copy = getRoutinesCopy(language);
  const [runs, setRuns] = useState<RoutineRun[] | null>(null);

  useEffect(() => {
    let live = true;
    fetchRuns(routineId).then((result) => {
      if (live) setRuns(result.ok ? result.value : []);
    });
    return () => {
      live = false;
    };
  }, [routineId, version]);

  if (runs === null) return null;
  if (runs.length === 0) {
    return (
      <p className="text-xs md:text-[13px] text-subtle">{copy.historyEmpty}</p>
    );
  }
  return (
    <ol className="flex flex-col gap-2" aria-label={copy.history}>
      {runs.map((run) => {
        const label = runLabel(run, copy);
        return (
          <li key={run.id} className="rounded-lg bg-surface px-3 py-2">
            <p className="text-[12px] text-muted">
              {formatWhen(run.finishedAt ?? run.startedAt, language)}
              {run.origin === "manual" && ` · ${copy.manualRun}`}
              {label && ` · ${label}`}
            </p>
            {run.output && (
              <p className="mt-1 text-xs md:text-[13px] whitespace-pre-wrap text-foreground">
                {run.output}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
