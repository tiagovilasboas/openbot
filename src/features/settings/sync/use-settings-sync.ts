"use client";

import { useCallback, useEffect, useState } from "react";
import { connectSettingsSync } from "../settings-sync-port.ts";
import {
  browserSettingsSyncPort,
  loadSettingsFromServer,
  subscribeSettingsSyncErrors,
} from "./browser-settings-sync.ts";
import type { SettingsSyncErrorCode } from "./settings-sync-failure.ts";

/**
 * Connects the language, memory switch and model config to the server and
 * loads them once. The error is the last refusal worth showing.
 */
export function useSettingsSync() {
  const [syncError, setSyncError] = useState<SettingsSyncErrorCode | null>(
    null,
  );

  useEffect(() => {
    connectSettingsSync(browserSettingsSyncPort);
    void loadSettingsFromServer();
    const unsubscribe = subscribeSettingsSyncErrors(setSyncError);
    return () => {
      unsubscribe();
      connectSettingsSync(null);
    };
  }, []);

  const dismissSyncError = useCallback(() => setSyncError(null), []);
  return { syncError, dismissSyncError };
}
