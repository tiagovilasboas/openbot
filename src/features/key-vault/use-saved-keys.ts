"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  loadSavedKeysOnce,
  readSavedKeysState,
  subscribeSavedKeys,
  type SavedKeysState,
} from "./saved-keys-store.ts";

const notLoaded: SavedKeysState = { keys: {}, loaded: false };

/** Which providers have a key saved on the server. Never the key itself. */
export function useSavedKeys(): SavedKeysState {
  useEffect(loadSavedKeysOnce, []);
  return useSyncExternalStore(
    subscribeSavedKeys,
    readSavedKeysState,
    () => notLoaded,
  );
}
