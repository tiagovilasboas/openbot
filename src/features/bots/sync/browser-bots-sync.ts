import {
  DEFAULT_BOTS_LIST,
  saveActiveBotId,
  saveBotsToStorage,
} from "../bot-storage.ts";
import { saveMainBotId } from "../main-bot.ts";
import { createBotsApi } from "./bots-api.ts";
import { createBotsPutQueue } from "./bots-put-queue.ts";
import {
  botsSyncErrorCode,
  type BotsSyncErrorCode,
} from "./bots-sync-failure.ts";
import type { ApiResult, SyncFailure } from "./bots-sync-types.ts";
import {
  isUnsynced,
  readLocalPayload,
  readLocalSnapshot,
  setUnsynced,
} from "./local-bots-port.ts";
import { pushRestoredBots } from "./push-restored-bots.ts";
import { syncBotsOnLoad, type LoadOutcome } from "./sync-bots-on-load.ts";

/** The browser's wiring of the bot sync: real fetch, real localStorage. */

type ErrorListener = (code: BotsSyncErrorCode) => void;
let errorListeners: ErrorListener[] = [];

export function subscribeBotsSyncErrors(listener: ErrorListener): () => void {
  errorListeners.push(listener);
  return () => {
    errorListeners = errorListeners.filter((l) => l !== listener);
  };
}

function report(failure: SyncFailure): void {
  const code = botsSyncErrorCode(failure);
  if (code) errorListeners.forEach((listener) => listener(code));
}

const storage = (): Storage => window.localStorage;
const api = createBotsApi();

const queue = createBotsPutQueue({
  send: (payload) => api.put(payload),
  onResult: (result: ApiResult) => {
    if (!result.ok) report(result.failure);
  },
  onDrained: (allSucceeded) => {
    if (allSucceeded) setUnsynced(storage(), false);
  },
});

let loading: Promise<LoadOutcome> | null = null;

/** Loads the bots from the server once per page; safe to call repeatedly. */
export function loadBotsFromServer(): Promise<LoadOutcome> {
  loading ??= syncBotsOnLoad({
    api,
    readLocal: () => readLocalSnapshot(storage()),
    isUnsynced: () => isUnsynced(storage()),
    setUnsynced: (value) => setUnsynced(storage(), value),
    mirror: (state) => {
      saveBotsToStorage(state.bots);
      if (state.activeBotId) saveActiveBotId(state.activeBotId);
      if (state.mainBotId) saveMainBotId(state.mainBotId);
    },
    presets: DEFAULT_BOTS_LIST,
    reportFailure: report,
  }).then((outcome) => {
    queue.noteServerMain(outcome.serverMainBotId);
    return outcome;
  });
  return loading;
}

/** Sends the bots as they are now, after a short pause that merges edits. */
export function pushBots(): void {
  const payload = readLocalPayload(storage());
  if (!payload) return;
  setUnsynced(storage(), true);
  queue.enqueue(payload);
}

/**
 * Sends a restored backup right away and says whether the server took it.
 * Whatever failed stays marked unsynced, so the next load retries it.
 */
export async function pushRestoredBackup(): Promise<SyncFailure | null> {
  const payload = readLocalPayload(storage());
  if (!payload) return null;
  setUnsynced(storage(), true);
  await queue.flush();
  const result = await pushRestoredBots(api, payload);
  if (result.ok) {
    setUnsynced(storage(), false);
    queue.noteServerMain(result.state.mainBotId);
    return null;
  }
  return result.failure;
}
