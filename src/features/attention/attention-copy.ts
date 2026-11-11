import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";

/** What assistive tech hears for a bot with replies the user has not seen. */
export function attentionLabel(language: ChatLanguage, count: number): string {
  switch (language) {
    case "pt":
      return count === 1 ? "1 resposta nova" : `${count} respostas novas`;
    case "en":
      return count === 1 ? "1 new reply" : `${count} new replies`;
    case "es":
      return count === 1 ? "1 respuesta nueva" : `${count} respuestas nuevas`;
  }
}

/** The pill is two characters wide at most. */
export function attentionPillText(count: number): string {
  return count > 9 ? "9+" : String(count);
}
