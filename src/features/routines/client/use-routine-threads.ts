"use client";

import { useEffect } from "react";
import type { ChatLanguage } from "../../chat/respond-to-message.ts";
import { syncRoutineThreads } from "./routine-thread-sync.ts";

/** Syncs thread-bound routines when the chat opens and the window refocuses. */
export function useRoutineThreads(botId: string, language: ChatLanguage) {
  useEffect(() => {
    let running = false;
    const sync = () => {
      if (running) return;
      running = true;
      syncRoutineThreads(botId, language)
        .catch(() => {})
        .finally(() => {
          running = false;
        });
    };
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [botId, language]);
}
