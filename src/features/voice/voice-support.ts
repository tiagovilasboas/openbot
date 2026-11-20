// What the browser offers for voice, and how the composer joins dictated text.
import type { Language } from "../language/language.ts";

/** The BCP 47 tag the browser's speech engines expect for each UI language. */
export const SPEECH_LANG: Record<Language, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

/** Longest reply read aloud; past it the speech stops at the cut. */
export const READ_ALOUD_MAX_CHARS = 4_000;

/** Joins dictated words to the draft with exactly one space between. */
export function appendDictation(draft: string, heard: string): string {
  const words = heard.trim();
  if (!words) return draft;
  if (!draft.trim()) return words;
  return /\s$/.test(draft) ? `${draft}${words}` : `${draft} ${words}`;
}

/**
 * Plain text to read aloud: markdown marks and code blocks are dropped so
 * the engine does not spell them out.
 */
export function speakableText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, READ_ALOUD_MAX_CHARS);
}
