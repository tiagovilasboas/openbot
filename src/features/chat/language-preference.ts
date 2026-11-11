import {
  DEFAULT_LANGUAGE,
  isLanguage,
  type Language,
} from "../language/language.ts";

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

export function saveLanguage(
  language: Language,
  storage = browserStorage(),
): void {
  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, language);
    listeners.forEach((listener) => listener());
  } catch {
    // Storage can be blocked; the choice then lasts only until reload.
  }
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
