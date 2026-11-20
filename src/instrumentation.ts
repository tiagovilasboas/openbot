// Runs once when the Next server starts. The routines scheduler and the
// Telegram bridge need the Node runtime (SQLite, timers), so the edge
// runtime skips them.
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
  // Off unless TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_CHATS are set.
  const { startTelegramBridge } =
    await import("./features/telegram/server/start-telegram-bridge.ts");
  startTelegramBridge(getLocalStore);
}
