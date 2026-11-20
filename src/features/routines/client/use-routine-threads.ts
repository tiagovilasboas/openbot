"use client";

import { useEffect } from "react";
import type { ChatLanguage } from "../../chat/respond-to-message.ts";
import { TICK_MS } from "../routine-tick.ts";
import { syncRoutineThreads } from "./routine-thread-sync.ts";

/**
 * Syncs thread-bound routines (wake-ups included) when the chat opens, when
 * the app comes back to the front, and once per scheduler tick while it is
 * on screen, so a run that lands with the app open shows without a reload.
 */
export function useRoutineThreads(botId: string, language: ChatLanguage) {
  useEffect(() => {
    let running = false;
    const sync = () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      syncRoutineThreads(botId, language)
        .catch(() => {})
        .finally(() => {
          running = false;
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    sync();
    const timer = window.setInterval(sync, TICK_MS);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [botId, language]);
}
