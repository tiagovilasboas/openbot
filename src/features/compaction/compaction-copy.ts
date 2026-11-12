import type { Language } from "../language/language.ts";

export interface CompactionCopy {
  /** The divider's label, with the number of messages it stands for. */
  divider: (count: number) => string;
  show: string;
  hide: string;
  archiveLabel: string;
  you: string;
  bot: string;
  /** Opens the history entry that carries the summary to the model. */
  summaryPrefix: string;
}

export const compactionCopy: Record<Language, CompactionCopy> = {
  pt: {
    divider: (n) => `Histórico anterior compactado (${n} mensagens)`,
    show: "Mostrar mensagens",
    hide: "Ocultar mensagens",
    archiveLabel: "Mensagens arquivadas",
    you: "Você",
    bot: "Assistente",
    summaryPrefix: "Resumo da conversa anterior:",
  },
  en: {
    divider: (n) => `Earlier history compacted (${n} messages)`,
    show: "Show messages",
    hide: "Hide messages",
    archiveLabel: "Archived messages",
    you: "You",
    bot: "Assistant",
    summaryPrefix: "Earlier conversation summary:",
  },
  es: {
    divider: (n) => `Historial anterior compactado (${n} mensajes)`,
    show: "Mostrar mensajes",
    hide: "Ocultar mensajes",
    archiveLabel: "Mensajes archivados",
    you: "Tú",
    bot: "Asistente",
    summaryPrefix: "Resumen de la conversación anterior:",
  },
};
