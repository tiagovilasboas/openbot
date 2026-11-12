"use client";

import { useCallback, useEffect, useState } from "react";
import { connectUsageSync } from "../usage-sync-port.ts";
import {
  browserUsageSyncPort,
  loadUsageFromServer,
  subscribeUsageSyncErrors,
} from "./browser-usage-sync.ts";
import type { UsageSyncErrorCode } from "./usage-sync-failure.ts";

/**
 * Connects the usage cache to the server and loads the log once. The error
 * is the last refusal worth showing.
 */
export function useUsageSync() {
  const [syncError, setSyncError] = useState<UsageSyncErrorCode | null>(null);

  useEffect(() => {
    connectUsageSync(browserUsageSyncPort);
    void loadUsageFromServer();
    const unsubscribe = subscribeUsageSyncErrors(setSyncError);
    return () => {
      unsubscribe();
      connectUsageSync(null);
    };
  }, []);

  const dismissSyncError = useCallback(() => setSyncError(null), []);
  return { syncError, dismissSyncError };
}
