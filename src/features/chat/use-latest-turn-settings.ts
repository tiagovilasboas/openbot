import { useEffect, useRef } from "react";
import type { TurnSettings } from "./turn-settings.ts";

/**
 * The turn settings as saved now. A queued turn starts from an older render;
 * it reads them from here instead of from its own closure.
 */
export function useLatestTurnSettings(settings: TurnSettings) {
  const latestRef = useRef(settings);
  useEffect(() => {
    latestRef.current = settings;
  }, [settings]);
  return latestRef;
}
