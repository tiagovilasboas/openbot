import type {
  SyncFailure,
  WriteResult,
} from "../../conversations/sync/conversations-sync-types.ts";
import type {
  AppSettings,
  SettingKey,
  SettingsPatch,
} from "../settings-types.ts";

export type { SyncFailure, WriteResult };

export type SettingsResult =
  { ok: true; settings: AppSettings } | { ok: false; failure: SyncFailure };

export interface SettingsApi {
  get(): Promise<SettingsResult>;
  put(patch: SettingsPatch): Promise<WriteResult>;
}

/** The value a setting has in this browser; undefined when it holds none. */
export type LocalSettings = { [K in SettingKey]?: AppSettings[K] };
