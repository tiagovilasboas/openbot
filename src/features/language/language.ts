/**
 * The one list of interface languages. Every dictionary is a
 * `Record<Language, ...>`, so adding a language here makes the compiler point
 * at each place that still needs its copy.
 */
export const LANGUAGES = ["pt", "en", "es"] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "pt";

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** The `lang` attribute for text written in each language. */
export const HTML_LANG: Record<Language, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es-419",
};

/** The locale used to format numbers and dates in each language. */
export const FORMAT_LOCALE: Record<Language, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-419",
};
