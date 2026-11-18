import type { ChatLanguage } from "../../chat/respond-to-message.ts";
import {
  loadBotMessages,
  saveBotMessages,
} from "../../chat/use-bot-messages.ts";
import { newThread } from "../../threads/thread-model.ts";
import { loadThreads, saveThreads } from "../../threads/thread-storage.ts";
import { routineThreadId, runsToMessages } from "./routine-thread.ts";
import { fetchRoutines, fetchRuns, type SavedRoutine } from "./routines-api.ts";

const HANDLED_KEY = "openbot_routine_runs_";
const HANDLED_MAX = 200;

function readHandled(routineId: string): number[] {
  try {
    const raw = JSON.parse(
      window.localStorage.getItem(HANDLED_KEY + routineId) ?? "[]",
    );
    return Array.isArray(raw) ? raw.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function writeHandled(routineId: string, ids: number[]): void {
  try {
    window.localStorage.setItem(
      HANDLED_KEY + routineId,
      JSON.stringify(ids.slice(-HANDLED_MAX)),
    );
  } catch {
    // Blocked storage: the next sync may add the same runs again.
  }
}

async function syncRoutine(
  routine: SavedRoutine,
  language: ChatLanguage,
): Promise<void> {
  const runs = await fetchRuns(routine.id);
  if (!runs.ok) return;
  const threadId = routineThreadId(routine.id);
  const handled = readHandled(routine.id);
  const existing = loadBotMessages(routine.botId, threadId);
  const fresh = runsToMessages(
    runs.value,
    existing,
    new Set(handled),
    language,
  );
  if (fresh.handledRunIds.length === 0) return;
  if (fresh.messages.length > 0) {
    const threads = loadThreads(routine.botId);
    if (!threads.some((t) => t.id === threadId)) {
      saveThreads(routine.botId, [
        ...threads,
        newThread(routine.botId, threadId, Date.now(), {
          title: routine.title,
        }),
      ]);
    }
    saveBotMessages(routine.botId, [...existing, ...fresh.messages], {
      threadId,
    });
  }
  writeHandled(routine.id, [...handled, ...fresh.handledRunIds]);
}

/** Copies new runs of the bot's thread-bound routines into their threads. */
export async function syncRoutineThreads(
  botId: string,
  language: ChatLanguage,
): Promise<void> {
  const routines = await fetchRoutines(botId);
  if (!routines.ok) return;
  for (const routine of routines.value) {
    if (routine.runInThread) await syncRoutine(routine, language);
  }
}
