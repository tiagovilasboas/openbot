const KEY = "openbot_first_run_connect";

type FlagStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function session(): FlagStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Remembers that a Connect started from the first-run card, across the redirect. */
export function markFirstRunConnect(
  storage: FlagStorage | null = session(),
): void {
  try {
    storage?.setItem(KEY, "1");
  } catch {
    // Without storage the return falls back to opening Settings.
  }
}

/** True once when the browser came back from a Connect started on first run. */
export function consumeFirstRunConnect(
  storage: FlagStorage | null = session(),
): boolean {
  try {
    if (storage?.getItem(KEY) !== "1") return false;
    storage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
