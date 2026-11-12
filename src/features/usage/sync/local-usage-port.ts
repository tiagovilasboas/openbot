/**
 * Set while this browser holds a usage log the server never confirmed. The
 * key must not start with `openbot_usage`, which belongs to the log itself.
 */
export const USAGE_UNSYNCED_KEY = "openbot_unsynced_usage";

export function isUsageUnsynced(storage: Pick<Storage, "getItem">): boolean {
  try {
    return storage.getItem(USAGE_UNSYNCED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUsageUnsynced(
  storage: Pick<Storage, "setItem" | "removeItem">,
  value: boolean,
): void {
  try {
    if (value) storage.setItem(USAGE_UNSYNCED_KEY, "1");
    else storage.removeItem(USAGE_UNSYNCED_KEY);
  } catch {
    // Without storage the next load simply trusts the server.
  }
}
