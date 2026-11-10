import type { ChatLanguage } from "../chat/respond-to-message.ts";

/** "850 ms", "4,2 s" or "1 min 5 s": how long a step took, for people. */
export function formatStepDuration(
  durationMs: number,
  language: ChatLanguage,
): string {
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  if (durationMs < 60_000) {
    const seconds = (durationMs / 1000).toFixed(1);
    return `${language === "pt" ? seconds.replace(".", ",") : seconds} s`;
  }
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}
