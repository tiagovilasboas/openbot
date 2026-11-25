"use client";

import { useEffect, useState } from "react";
import type { Language } from "../../language/language.ts";
import { requestOpenRoutine } from "./open-routine-event.ts";
import { formatWhen } from "./routine-format.ts";
import { getRoutinesCopy } from "./routines-copy.ts";
import { fetchRoutines, type SavedRoutine } from "./routines-api.ts";

interface GoalRoutinesListProps {
  botId: string;
  language: Language;
}

/** The routines linked to the bot's goal: name and next run, read-only. */
export function GoalRoutinesList({ botId, language }: GoalRoutinesListProps) {
  const copy = getRoutinesCopy(language);
  const [linked, setLinked] = useState<SavedRoutine[]>([]);

  useEffect(() => {
    let live = true;
    fetchRoutines(botId).then((result) => {
      if (live && result.ok) {
        setLinked(result.value.filter((r) => r.goalLinked));
      }
    });
    return () => {
      live = false;
    };
  }, [botId]);

  if (linked.length === 0) return null;
  return (
    <section
      aria-label={copy.goalRoutinesTitle}
      className="flex flex-col gap-1.5"
    >
      <h4 className="text-sm font-medium text-foreground">
        {copy.goalRoutinesTitle}
      </h4>
      <ul className="flex flex-col gap-1">
        {linked.map((routine) => (
          <li
            key={routine.id}
            className="flex items-center justify-between gap-2 text-xs text-muted md:text-[13px]"
          >
            <span className="min-w-0">
              <span className="block truncate text-foreground">
                {routine.title}
              </span>
              {routine.enabled && routine.nextRunAt !== null
                ? copy.nextRun(formatWhen(routine.nextRunAt, language))
                : copy.paused}
            </span>
            <button
              type="button"
              onClick={() => requestOpenRoutine(routine.id)}
              className="min-h-9 shrink-0 rounded-full px-3 font-medium text-foreground hover:bg-surface-secondary"
            >
              {copy.openRoutine}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
