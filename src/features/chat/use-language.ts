"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE } from "../language/language.ts";
import {
  loadLanguage,
  saveLanguage,
  subscribeLanguage,
} from "./language-preference.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

const getServerLanguage = (): ChatLanguage => DEFAULT_LANGUAGE;

export function useLanguage(): [
  ChatLanguage,
  (language: ChatLanguage) => void,
] {
  const language = useSyncExternalStore(
    subscribeLanguage,
    () => loadLanguage(),
    getServerLanguage,
  );
  return [language, saveLanguage];
}
