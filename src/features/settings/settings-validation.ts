import { isLanguage } from "../language/language.ts";
import {
  validateClientModelConfig,
  withoutApiKey,
} from "../model/model-config.ts";
import type { AppSettings, SettingKey } from "./settings-types.ts";

/**
 * The one validator of each setting, used by the server before storing and
 * by the browser before trusting a reply. It returns the cleaned value, or
 * undefined when the value is not acceptable. A model config never keeps an
 * API key: keys live in the key vault only.
 */
const VALIDATORS: {
  [K in SettingKey]: (value: unknown) => AppSettings[K] | undefined;
} = {
  language: (value) => (isLanguage(value) ? value : undefined),
  memoryEnabled: (value) => (typeof value === "boolean" ? value : undefined),
  modelConfig: (value) => {
    const config = validateClientModelConfig(value);
    return config ? withoutApiKey(config) : undefined;
  },
};

export function validateSetting(
  key: SettingKey,
  value: unknown,
): AppSettings[SettingKey] | undefined {
  return VALIDATORS[key](value);
}
