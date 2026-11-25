import type { DatabaseSync } from "node:sqlite";
import { canIdlePause, isIdle } from "../routine-idle.ts";
import { listRoutines } from "./routines-repository.ts";

/** When the person last chatted with a bot (epoch ms); null when unknown. */
export type LastInteraction = (botId: string) => number | null;

/**
 * Pauses every enabled recurring routine whose person has been away for
 * IDLE_PAUSE_DAYS, so it stops spending quota. A routine mid-run is left for
 * the next tick. Returns how many were paused. Saving a routine again (the
 * "Retomar" switch) clears the mark and restarts the clock.
 */
export function pauseIdleRoutines(
  db: DatabaseSync,
  now: number,
  lastInteraction: LastInteraction,
): number {
  let paused = 0;
  const pause = db.prepare(
    `UPDATE routines SET enabled = 0, next_run_at = NULL, idle_paused_at = ?,
       data = json_set(data, '$.enabled', json('false'))
     WHERE id = ? AND enabled = 1 AND running_since IS NULL`,
  );
  for (const routine of listRoutines(db)) {
    if (!routine.enabled || routine.runningSince !== null) continue;
    if (!canIdlePause(routine)) continue;
    if (!isIdle(routine.updatedAt, lastInteraction(routine.botId), now))
      continue;
    paused += Number(pause.run(now, routine.id).changes);
  }
  return paused;
}
