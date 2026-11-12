import { isSettingKey, type SettingKey } from "../settings-types.ts";

/**
 * Holds the settings this browser changed without the server confirming it,
 * as a JSON list of setting keys. Per key, so one stuck setting never makes
 * another's newer server value lose. Its name shares no prefix with any other
 * stored key.
 */
export const SETTINGS_UNSYNCED_KEY = "openbot_settings_unsynced";

function readKeys(storage: Storage): Set<SettingKey> {
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(SETTINGS_UNSYNCED_KEY) ?? "[]",
    );
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter(
            (key): key is SettingKey =>
              typeof key === "string" && isSettingKey(key),
          )
        : [],
    );
  } catch {
    return new Set();
  }
}

export function isSettingUnsynced(storage: Storage, key: SettingKey): boolean {
  return readKeys(storage).has(key);
}

export function setSettingUnsynced(
  storage: Storage,
  key: SettingKey,
  value: boolean,
): void {
  try {
    const keys = readKeys(storage);
    if (value) keys.add(key);
    else keys.delete(key);
    if (keys.size > 0) {
      storage.setItem(SETTINGS_UNSYNCED_KEY, JSON.stringify([...keys]));
    } else {
      storage.removeItem(SETTINGS_UNSYNCED_KEY);
    }
  } catch {
    // Without storage the next load simply trusts the server.
  }
}
