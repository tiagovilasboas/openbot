"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { appBadgePort, syncAppBadge } from "@/features/pwa/app-badge.ts";
import {
  addAttention,
  clearAttention,
  shouldCountReply,
  totalAttention,
} from "./attention-counts.ts";
import {
  loadAttention,
  NO_ATTENTION,
  saveAttention,
  subscribeAttention,
} from "./attention-storage.ts";

const tabIsVisible = () => document.visibilityState !== "hidden";

function subscribeVisibility(listener: () => void): () => void {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

/**
 * Counts the replies a bot sent out of view (another bot open, or the tab
 * hidden), clears a bot's count when the user is looking at it, and mirrors
 * the total on the installed app's icon.
 */
export function useAttention(activeBotId: string, botIds: readonly string[]) {
  const counts = useSyncExternalStore(
    subscribeAttention,
    loadAttention,
    () => NO_ATTENTION,
  );
  const visible = useSyncExternalStore(
    subscribeVisibility,
    tabIsVisible,
    () => true,
  );
  // A turn finishes in a closure from when it began, so it asks for the view
  // as it is now, not as it was.
  const viewingRef = useRef(activeBotId);
  useEffect(() => {
    viewingRef.current = activeBotId;
  }, [activeBotId]);

  const noteReply = useCallback((botId: string) => {
    if (shouldCountReply(botId, viewingRef.current, tabIsVisible())) {
      saveAttention(addAttention(loadAttention(), botId));
    }
  }, []);

  // Looking at the open bot is reading it.
  const seen = visible && (counts[activeBotId] ?? 0) > 0;
  useEffect(() => {
    if (seen) saveAttention(clearAttention(loadAttention(), activeBotId));
  }, [seen, activeBotId]);

  const total = totalAttention(counts, botIds);
  useEffect(() => {
    void syncAppBadge(appBadgePort(), total);
  }, [total]);

  return { attentionCounts: counts, noteReply };
}
