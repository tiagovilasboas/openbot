import type { DatabaseSync } from "node:sqlite";
import {
  deleteRoutine,
  listRoutines,
} from "../../routines/server/routines-repository.ts";
import { HOUR_MS } from "./bot-messages-repository.ts";

/** Ids of the one-shot routines that carry a handoff to the target bot. */
export const HANDOFF_ID_PREFIX = "m_";

/**
 * Deletes handoff routines that already ran. They linger for an hour so the
 * chat can copy the reply into the thread first; after that they would only
 * crowd the person's routines and the per-bot limit.
 */
export function pruneFinishedHandoffs(db: DatabaseSync, now: number): number {
  let removed = 0;
  for (const routine of listRoutines(db)) {
    const done =
      routine.id.startsWith(HANDOFF_ID_PREFIX) &&
      routine.schedule.kind === "once" &&
      !routine.enabled &&
      routine.lastRunAt !== null &&
      routine.lastRunAt < now - HOUR_MS;
    if (done && deleteRoutine(db, routine.id)) removed += 1;
  }
  return removed;
}
