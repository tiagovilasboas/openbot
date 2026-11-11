"use client";

import { useCallback, useEffect, useState } from "react";
import { loadBotsFromServer } from "../../bots/sync/browser-bots-sync.ts";
import { connectMessagesSync } from "../../chat/messages-sync-port.ts";
import {
  browserMessagesSyncPort,
  loadConversationsFromServer,
  subscribeConversationsSyncErrors,
} from "./browser-conversations-sync.ts";
import type { ConversationsSyncErrorCode } from "./conversations-sync-failure.ts";

/**
 * Connects the thread cache to the server and loads the threads once the
 * bots are loaded. The error is the last refusal worth showing.
 */
export function useConversationsSync() {
  const [syncError, setSyncError] = useState<ConversationsSyncErrorCode | null>(
    null,
  );

  useEffect(() => {
    connectMessagesSync(browserMessagesSyncPort);
    void loadBotsFromServer().then(loadConversationsFromServer);
    const unsubscribe = subscribeConversationsSyncErrors(setSyncError);
    return () => {
      unsubscribe();
      connectMessagesSync(null);
    };
  }, []);

  const dismissSyncError = useCallback(() => setSyncError(null), []);
  return { syncError, dismissSyncError };
}
