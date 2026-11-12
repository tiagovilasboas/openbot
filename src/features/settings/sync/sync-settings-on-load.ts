import {
  SETTING_KEYS,
  type AppSettings,
  type SettingKey,
  type SettingsPatch,
} from "../settings-types.ts";
import { decideSettingLoad } from "./settings-load-decision.ts";
import type { SettingsApi, SyncFailure } from "./settings-sync-types.ts";

export interface LoadDeps {
  api: SettingsApi;
  /** The browser's value of a setting; undefined when it holds none. */
  readLocal(key: SettingKey): AppSettings[SettingKey] | undefined;
  isUnsynced(key: SettingKey): boolean;
  setUnsynced(key: SettingKey, value: boolean): void;
  /** Makes the browser match the server, without sending anything back. */
  mirror(key: SettingKey, value: AppSettings[SettingKey]): void;
  reportFailure(failure: SyncFailure): void;
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * The first load of the settings: the server is the source of truth and the
 * browser's copy is a cache. Whatever cannot be delivered stays marked
 * unsynced, so the next load tries again.
 */
export async function syncSettingsOnLoad(deps: LoadDeps): Promise<void> {
  const before = Object.fromEntries(
    SETTING_KEYS.map((key) => [key, deps.readLocal(key)]),
  );
  const server = await deps.api.get();
  const toImport: Record<string, unknown> = {};

  for (const key of SETTING_KEYS) {
    const local = deps.readLocal(key);
    // Changed while the request was out: that newer value is already queued
    // for the server, and mirroring would overwrite it.
    if (!same(local, before[key])) continue;
    const decision = decideSettingLoad({
      server,
      key,
      local,
      unsynced: deps.isUnsynced(key),
    });
    if (decision.action === "use-server") deps.mirror(key, decision.value);
    else if (decision.action === "import") toImport[key] = decision.value;
    // An unreachable server leaves the browser's value undelivered.
    else if (!server.ok && local !== undefined) deps.setUnsynced(key, true);
  }

  const keys = Object.keys(toImport) as SettingKey[];
  if (keys.length === 0) return;
  const result = await deps.api.put(toImport as SettingsPatch);
  if (!result.ok) deps.reportFailure(result.failure);
  for (const key of keys) deps.setUnsynced(key, !result.ok);
}
