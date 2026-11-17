const KEY = "openbot_first_run_connect";
const RETURNED = "openbot_first_run_returned";

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
    storage?.removeItem(RETURNED);
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
    storage.setItem(RETURNED, "1");
    return true;
  } catch {
    return false;
  }
}

/** True while the last Connect that came back began on the first-run card. */
export function cameBackToFirstRun(
  storage: FlagStorage | null = session(),
): boolean {
  try {
    return storage?.getItem(RETURNED) === "1";
  } catch {
    return false;
  }
}

/** Forgets the return, once the user retried or moved on. */
export function clearFirstRunReturn(
  storage: FlagStorage | null = session(),
): void {
  try {
    storage?.removeItem(RETURNED);
  } catch {
    // Nothing to clear without storage.
  }
}
