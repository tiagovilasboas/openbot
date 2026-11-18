"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoutineInput } from "../routine-input.ts";
import {
  fetchRoutines,
  putRoutine,
  removeRoutine,
  runRoutineNow,
  type SavedRoutine,
} from "./routines-api.ts";

export type RoutinesState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; routines: SavedRoutine[] };

/** One bot's routines, with save, delete, pause and run-now. */
export function useRoutines(botId: string) {
  const [state, setState] = useState<RoutinesState>({ status: "loading" });
  const [runningIds, setRunningIds] = useState<ReadonlySet<string>>(new Set());

  const reload = useCallback(async () => {
    const result = await fetchRoutines(botId);
    setState(
      result.ok
        ? { status: "ready", routines: result.value }
        : { status: "failed" },
    );
  }, [botId]);

  useEffect(() => {
    let live = true;
    fetchRoutines(botId).then((result) => {
      if (!live) return;
      setState(
        result.ok
          ? { status: "ready", routines: result.value }
          : { status: "failed" },
      );
    });
    return () => {
      live = false;
    };
  }, [botId]);

  /** Saves a routine; true on success. */
  const save = useCallback(
    async (input: RoutineInput) => {
      const result = await putRoutine(input);
      if (result.ok) await reload();
      return result.ok;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await removeRoutine(id);
      if (result.ok) await reload();
      return result.ok;
    },
    [reload],
  );

  /** Runs a routine now; true when the run finished (even as a failure). */
  const runNow = useCallback(
    async (id: string) => {
      setRunningIds((ids) => new Set(ids).add(id));
      const result = await runRoutineNow(id);
      setRunningIds((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
      await reload();
      return result.ok;
    },
    [reload],
  );

  return { state, runningIds, save, remove, runNow, reload };
}
