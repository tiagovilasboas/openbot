import { fetchSavedKeys, type SavedKeys } from "./saved-keys-api.ts";

// Browser-side view of what the server has saved. It holds no key values.

export type SavedKeysState = { keys: SavedKeys; loaded: boolean };

let state: SavedKeysState = { keys: {}, loaded: false };
let listeners: Array<() => void> = [];
let inFlight: Promise<void> | null = null;

export function subscribeSavedKeys(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

export function readSavedKeysState(): SavedKeysState {
  return state;
}

/** Asks the server again; a failed answer keeps the last known state. */
export function refreshSavedKeys(): Promise<void> {
  inFlight ??= fetchSavedKeys()
    .then((keys) => {
      if (keys) {
        state = { keys, loaded: true };
        for (const listener of listeners) listener();
      }
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function loadSavedKeysOnce(): void {
  if (!state.loaded) void refreshSavedKeys();
}
