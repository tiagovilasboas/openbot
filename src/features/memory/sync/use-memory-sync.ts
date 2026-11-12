"use client";

import { useCallback, useEffect, useState } from "react";
import { loadBotsFromServer } from "../../bots/sync/browser-bots-sync.ts";
import { connectMemorySync } from "../memory-sync-port.ts";
import {
  browserMemorySyncPort,
  loadMemoryFromServer,
  subscribeMemorySyncErrors,
} from "./browser-memory-sync.ts";
import type { MemorySyncErrorCode } from "./memory-sync-failure.ts";

/**
 * Connects the notes cache to the server and loads the notes once the bots
 * are loaded. The error is the last refusal worth showing.
 */
export function useMemorySync() {
  const [syncError, setSyncError] = useState<MemorySyncErrorCode | null>(null);

  useEffect(() => {
    connectMemorySync(browserMemorySyncPort);
    void loadBotsFromServer().then(loadMemoryFromServer);
    const unsubscribe = subscribeMemorySyncErrors(setSyncError);
    return () => {
      unsubscribe();
      connectMemorySync(null);
    };
  }, []);

  const dismissSyncError = useCallback(() => setSyncError(null), []);
  return { syncError, dismissSyncError };
}
