import { loadBotsFromStorage } from "../../bots/bot-storage.ts";
import type { SyncFailure } from "../../conversations/sync/conversations-sync-types.ts";
import type { MemoryEntry } from "../memory-entries.ts";
import type { MemorySyncPort } from "../memory-sync-port.ts";
import { loadMemoryEntries, saveMemoryEntries } from "../memory-storage.ts";
import { isMemoryUnsynced, setMemoryUnsynced } from "./local-memory-port.ts";
import { createMemoryApi } from "./memory-api.ts";
import { createMemoryPutQueue } from "./memory-put-queue.ts";
import {
  memorySyncErrorCode,
  type MemorySyncErrorCode,
} from "./memory-sync-failure.ts";
import { refreshMemoryNotes } from "./refresh-memory-notes.ts";
import { syncMemoryOnLoad } from "./sync-memory-on-load.ts";

/** The browser's wiring of the notes sync: real fetch and storage. */

type ErrorListener = (code: MemorySyncErrorCode) => void;
let errorListeners: ErrorListener[] = [];

export function subscribeMemorySyncErrors(listener: ErrorListener): () => void {
  errorListeners.push(listener);
  return () => {
    errorListeners = errorListeners.filter((l) => l !== listener);
  };
}

function report(failure: SyncFailure): void {
  const code = memorySyncErrorCode(failure);
  if (code) errorListeners.forEach((listener) => listener(code));
}

const storage = (): Storage => window.localStorage;
const api = createMemoryApi();

const queue = createMemoryPutQueue({
  send: (botId, op) =>
    op.kind === "delete" ? api.remove(botId) : api.put(botId, op.entries),
  onResult: (botId, result, settled) => {
    if (!result.ok) report(result.failure);
    else if (settled) setMemoryUnsynced(storage(), botId, false);
  },
});

/** What the notes cache calls on every save and every forget. */
export const browserMemorySyncPort: MemorySyncPort = {
  saved(botId, entries) {
    setMemoryUnsynced(storage(), botId, true);
    queue.put(botId, entries);
  },
  forgotten(botId) {
    setMemoryUnsynced(storage(), botId, true);
    queue.remove(botId);
  },
};

const mirror = (botId: string, entries: MemoryEntry[]) =>
  saveMemoryEntries(botId, entries, undefined, { sync: false });

/** The server changed a bot's notes (a tool saved one): take its copy. */
export function refreshMemoryFromServer(botId: string): Promise<void> {
  return refreshMemoryNotes(
    {
      api,
      readLocal: (id) => loadMemoryEntries(id),
      isUnsynced: (id) => isMemoryUnsynced(storage(), id),
      mirror,
    },
    botId,
  ).catch(() => {
    // The next load catches up.
  });
}

let loading: Promise<void> | null = null;

/** Loads every bot's notes once per page; safe to call repeatedly. */
export function loadMemoryFromServer(): Promise<void> {
  loading ??= syncMemoryOnLoad({
    api,
    botIds: () => loadBotsFromStorage().map((bot) => bot.id),
    readLocal: (botId) => loadMemoryEntries(botId),
    isUnsynced: (botId) => isMemoryUnsynced(storage(), botId),
    setUnsynced: (botId, value) => setMemoryUnsynced(storage(), botId, value),
    mirror,
    reportFailure: report,
  }).catch(() => {
    // Loading never throws: the cache is used as it is.
  });
  return loading;
}
