import type { Language } from "../language/language.ts";
import type { ClientModelConfig } from "../model/model-config.ts";

/** The preferences kept in the local store; none of them holds a secret. */
export const SETTING_KEYS = [
  "language",
  "memoryEnabled",
  "modelConfig",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/** What the server holds: only the keys that were ever saved. */
export interface AppSettings {
  language?: Language;
  memoryEnabled?: boolean;
  modelConfig?: ClientModelConfig;
}

/** A change to the settings: `null` clears that key, an absent key is kept. */
export type SettingsPatch = { [K in SettingKey]?: AppSettings[K] | null };

export function isSettingKey(value: string): value is SettingKey {
  return (SETTING_KEYS as readonly string[]).includes(value);
}
