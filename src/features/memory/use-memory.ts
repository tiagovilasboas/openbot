"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  addMemoryEntry,
  clearMemory,
  editMemoryEntry,
  removeMemoryEntry,
  type MemoryEditFailure,
  type MemoryEditResult,
  type MemoryEntry,
} from "./memory-entries.ts";
import {
  loadMemoryEnabled,
  saveMemoryEnabled,
  subscribeMemoryEnabled,
} from "./memory-setting.ts";
import {
  loadMemoryEntries,
  saveMemoryEntries,
  subscribeMemory,
} from "./memory-storage.ts";

const NO_ENTRIES: MemoryEntry[] = [];
const getServerEntries = () => NO_ENTRIES;
const getServerEnabled = () => true;

function newEntryId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** What a failed change says, or null when it was saved. */
export type MemoryActionResult = MemoryEditFailure | null;

/** One bot's notes and the actions on them. Each change saves at once. */
export function useBotMemory(botId: string) {
  const subscribe = useCallback(
    (listener: () => void) => subscribeMemory(botId, listener),
    [botId],
  );
  const entries = useSyncExternalStore(
    subscribe,
    () => loadMemoryEntries(botId),
    getServerEntries,
  );

  const commit = useCallback(
    (result: MemoryEditResult): MemoryActionResult => {
      if (!result.ok) return result.reason;
      saveMemoryEntries(botId, result.entries);
      return null;
    },
    [botId],
  );

  const add = useCallback(
    (text: string) =>
      commit(addMemoryEntry(loadMemoryEntries(botId), text, newEntryId())),
    [botId, commit],
  );
  const edit = useCallback(
    (id: string, text: string) =>
      commit(editMemoryEntry(loadMemoryEntries(botId), id, text)),
    [botId, commit],
  );
  const remove = useCallback(
    (id: string) =>
      commit({
        ok: true,
        entries: removeMemoryEntry(loadMemoryEntries(botId), id),
      }),
    [botId, commit],
  );
  const clear = useCallback(
    () => commit({ ok: true, entries: clearMemory() }),
    [commit],
  );

  return { entries, add, edit, remove, clear };
}

/** The global "use memory" switch: on unless the user turned it off. */
export function useMemoryEnabled() {
  const enabled = useSyncExternalStore(
    subscribeMemoryEnabled,
    () => loadMemoryEnabled(),
    getServerEnabled,
  );
  return { enabled, setEnabled: saveMemoryEnabled };
}
