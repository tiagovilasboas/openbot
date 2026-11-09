import type { ChatLanguage } from "./respond-to-message.ts";

/** The PT/EN choice survives reloads; Portuguese is the default. */

const LANGUAGE_STORAGE_KEY = "openbot_language";
export const DEFAULT_LANGUAGE: ChatLanguage = "pt";

let listeners: Array<() => void> = [];

function browserStorage(): Storage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

export function loadLanguage(storage = browserStorage()): ChatLanguage {
  try {
    const stored = storage?.getItem(LANGUAGE_STORAGE_KEY);
    return stored === "pt" || stored === "en" ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function saveLanguage(
  language: ChatLanguage,
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
