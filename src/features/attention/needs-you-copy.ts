import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { attentionLabel } from "./attention-copy.ts";
import type { NeedsYouItem } from "./needs-you.ts";

const COPY = {
  pt: {
    group: "Precisam de você",
    approval: "Aguardando sua aprovação",
    failed: "A última resposta falhou",
  },
  en: {
    group: "Need you",
    approval: "Waiting for your approval",
    failed: "The last reply failed",
  },
  es: {
    group: "Te necesitan",
    approval: "Esperando tu aprobación",
    failed: "La última respuesta falló",
  },
} as const;

export function needsYouGroupLabel(language: ChatLanguage): string {
  return COPY[language].group;
}

/** What the row says about why the agent is waiting. */
export function needsYouReasonLabel(
  language: ChatLanguage,
  item: NeedsYouItem,
): string {
  if (item.reason === "unread") {
    return attentionLabel(language, item.count ?? 1);
  }
  return COPY[language][item.reason];
}
