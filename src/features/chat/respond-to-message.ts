import type { Language } from "../language/language.ts";
export type ChatLanguage = Language;

export type MessageResponseOutcome = {
  kind: "unconfigured";
  text: string;
};

const UNCONFIGURED_MESSAGE: Record<ChatLanguage, string> = {
  pt: "Nenhum modelo configurado. Conecte um modelo em Configurações.",
  en: "No model configured. Connect a model in Settings.",
  es: "Ningún modelo configurado. Conecta un modelo en Configuración.",
};

export function getUnconfiguredModelMessage(language: ChatLanguage): string {
  return UNCONFIGURED_MESSAGE[language];
}

export function respondToMessage(
  _input: string,
  language: ChatLanguage,
): MessageResponseOutcome {
  return {
    kind: "unconfigured",
    text: getUnconfiguredModelMessage(language),
  };
}
