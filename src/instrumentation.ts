// Runs once when the Next server starts. The routines scheduler needs the
// Node runtime (SQLite, timers), so the edge runtime skips it.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [
    { startRoutineScheduler },
    { createModelRoutineRunner },
    { getLocalStore },
  ] = await Promise.all([
    import("./features/routines/server/scheduler.ts"),
    import("./features/routines/server/model-routine-runner.ts"),
    import("./shared/local-store/local-store.ts"),
  ]);
  startRoutineScheduler({
    getDb: getLocalStore,
    makeRunner: createModelRoutineRunner,
  });
}
