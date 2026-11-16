import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/** A wait as "45 s", "12 min" or "2 h 5 min": rounded up, never exact. */
export function formatResetWait(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** "Limit resets in 12 min", or "" when the provider gave no reset time. */
export function describeResetWait(
  seconds: number | undefined,
  language: ChatLanguage,
): string {
  return seconds
    ? `${chatCopy[language].limitResetsIn} ${formatResetWait(seconds)}`
    : "";
}
