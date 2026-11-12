import {
  DEFAULT_LANGUAGE,
  isLanguage,
  type Language,
} from "../language/language.ts";
import { notifySettingsChanged } from "../settings/settings-sync-port.ts";

/** The language choice survives reloads; Portuguese is the default. */

const LANGUAGE_STORAGE_KEY = "openbot_language";
let listeners: Array<() => void> = [];

function browserStorage(): Storage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

export function loadLanguage(storage = browserStorage()): Language {
  try {
    const stored = storage?.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** The saved choice; undefined when the user never made one. */
export function loadStoredLanguage(
  storage = browserStorage(),
): Language | undefined {
  try {
    const stored = storage?.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Saves the choice and queues it for the server. The load passes
 * `sync: false` to mirror what the server holds without sending it back.
 */
export function saveLanguage(
  language: Language,
  storage = browserStorage(),
  options: { sync?: boolean } = {},
): void {
  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, language);
    listeners.forEach((listener) => listener());
  } catch {
    // Storage can be blocked; the choice then lasts only until reload.
  }
  if (options.sync !== false) notifySettingsChanged({ language });
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
