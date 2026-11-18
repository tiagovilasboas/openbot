/**
 * Silent runs: a routine that finds nothing new answers with a marker, and
 * that run leaves no message behind. A marker inside a longer report does not
 * count, so a real report is never hidden.
 */

export const NO_UPDATE_MARKER = "[[no-update]]";
const MARKERS = [NO_UPDATE_MARKER, "[SILENT]"];

type Language = "pt" | "en" | "es";

const INSTRUCTION: Record<Language, string> = {
  pt: `Se não houver nada novo para relatar, responda apenas ${NO_UPDATE_MARKER}.`,
  en: `If there is nothing new to report, reply with ${NO_UPDATE_MARKER} only.`,
  es: `Si no hay nada nuevo que informar, responde solo ${NO_UPDATE_MARKER}.`,
};

/** The routine prompt sent to the model, with the marker rule when silent. */
export function routinePrompt(
  prompt: string,
  silentWhenNothingNew: boolean,
  language: Language,
): string {
  return silentWhenNothingNew
    ? `${prompt}\n\n${INSTRUCTION[language]}`
    : prompt;
}

/** Whether a reply is only the no-update marker (case and spaces ignored). */
export function isNothingNew(reply: string): boolean {
  const trimmed = reply.trim().toLowerCase();
  return MARKERS.some((marker) => trimmed === marker.toLowerCase());
}
