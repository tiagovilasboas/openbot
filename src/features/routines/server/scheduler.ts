import type { DatabaseSync } from "node:sqlite";
import { TICK_MS } from "../routine-tick.ts";
import { runDueRoutines, type RoutineRunner } from "./run-routines.ts";

export { TICK_MS };

const STARTED = Symbol.for("openbot.routines.scheduler");

type Deps = {
  getDb: () => DatabaseSync;
  makeRunner: (db: DatabaseSync) => RoutineRunner;
  intervalMs?: number;
};

/**
 * Starts the routines tick once per server process. A tick never overlaps
 * the previous one, and a failing tick is logged and retried next time.
 * `OPENBOT_ROUTINES=off` turns the scheduler off.
 */
export function startRoutineScheduler(
  deps: Deps,
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  if (env.OPENBOT_ROUTINES === "off") return false;
  const registry = globalThis as { [STARTED]?: true };
  if (registry[STARTED]) return false;
  registry[STARTED] = true;
  let ticking = false;
  const timer = setInterval(() => {
    if (ticking) return;
    ticking = true;
    const db = deps.getDb();
    runDueRoutines(db, deps.makeRunner(db))
      .catch((error: unknown) => {
        console.error(
          "Open Bot routines tick failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      })
      .finally(() => {
        ticking = false;
      });
  }, deps.intervalMs ?? TICK_MS);
  timer.unref?.();
  return true;
}
