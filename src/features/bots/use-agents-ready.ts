"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { BotProfile } from "./bot-types.ts";
import { loadBotsFromStorage, subscribeBots } from "./bot-storage.ts";
import { loadBotsFromServer } from "./sync/browser-bots-sync.ts";

const NO_BOTS: BotProfile[] = [];

/**
 * Whether the person has agents yet. "checking" until the server answered
 * (or failed), so a saved crew never flashes the setup on load.
 */
export function useAgentsReady(): "checking" | "setup" | "ready" {
  const bots = useSyncExternalStore(
    subscribeBots,
    loadBotsFromStorage,
    () => NO_BOTS,
  );
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let live = true;
    void loadBotsFromServer()
      .catch(() => undefined)
      .finally(() => {
        if (live) setChecked(true);
      });
    return () => {
      live = false;
    };
  }, []);
  if (bots.length > 0) return "ready";
  return checked ? "setup" : "checking";
}
