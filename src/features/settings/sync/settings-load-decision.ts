import type { AppSettings, SettingKey } from "../settings-types.ts";
import type { SettingsResult } from "./settings-sync-types.ts";

export type SettingLoadDecision =
  | { action: "use-server"; value: AppSettings[SettingKey] }
  | { action: "import"; value: AppSettings[SettingKey] | null }
  | { action: "keep-local" };

/**
 * What the first load does for one setting. The server is the source of
 * truth, except when it cannot be reached or when this browser holds a change
 * it never delivered (an undelivered clear included: it imports null). A
 * server without the setting takes the browser's value.
 */
export function decideSettingLoad(input: {
  server: SettingsResult;
  key: SettingKey;
  local: AppSettings[SettingKey] | undefined;
  unsynced: boolean;
}): SettingLoadDecision {
  const { server, key, local, unsynced } = input;
  if (!server.ok) return { action: "keep-local" };
  if (unsynced) return { action: "import", value: local ?? null };
  const remote = server.settings[key];
  if (remote !== undefined) {
    return JSON.stringify(remote) === JSON.stringify(local)
      ? { action: "keep-local" }
      : { action: "use-server", value: remote };
  }
  return local !== undefined
    ? { action: "import", value: local }
    : { action: "keep-local" };
}
