import { fetchSavedKeys, type SavedKeys } from "./saved-keys-api.ts";

// Browser-side view of what the server has saved. It holds no key values.

export type SavedKeysState = {
  keys: SavedKeys;
  /** The server has answered at least once. */
  loaded: boolean;
  /** The last attempt failed and nothing was ever loaded. */
  failed: boolean;
};

let state: SavedKeysState = { keys: {}, loaded: false, failed: false };
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

function publish(next: SavedKeysState): void {
  state = next;
  for (const listener of listeners) listener();
}

/**
 * Asks the server again. A failed answer keeps the last known keys; when none
 * was ever loaded it is recorded as failed, so readers can offer a retry
 * instead of waiting forever.
 */
export function refreshSavedKeys(): Promise<void> {
  if (state.failed) publish({ ...state, failed: false });
  inFlight ??= fetchSavedKeys()
    .then((keys) => {
      if (keys) publish({ keys, loaded: true, failed: false });
      else if (!state.loaded) publish({ ...state, failed: true });
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function loadSavedKeysOnce(): void {
  if (!state.loaded) void refreshSavedKeys();
}
