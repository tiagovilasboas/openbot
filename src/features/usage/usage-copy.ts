import type { ChatLanguage } from "../chat/respond-to-message.ts";

/** Copy for the Usage tab of Settings. One entry per language. */
export interface UsageCopy {
  title: string;
  description: string;
  deviceNote: string;
  noBots: string;
  noReplies: string;
  total: string;
  lastSevenDays: string;
  input: string;
  output: string;
  replies: (count: number) => string;
  withoutData: (count: number) => string;
  reset: (botName: string) => string;
  resetAll: string;
  confirmBot: string;
  confirmAll: string;
  confirmAction: string;
  cancel: string;
}

const PT: UsageCopy = {
  title: "Uso por bot",
  description:
    "Quantos tokens cada bot usou. O número vem do provedor; quando ele não informa, nada é estimado.",
  deviceNote: "Fica só neste navegador e não entra no backup.",
  noBots: "Nenhum bot ainda.",
  noReplies: "Nenhuma resposta contada ainda.",
  total: "Total",
  lastSevenDays: "Últimos 7 dias",
  input: "entrada",
  output: "saída",
  replies: (count) => (count === 1 ? "1 resposta" : `${count} respostas`),
  withoutData: (count) =>
    count === 1
      ? "1 resposta sem dados de uso"
      : `${count} respostas sem dados de uso`,
  reset: (botName) => `Zerar uso de ${botName}`,
  resetAll: "Zerar tudo",
  confirmBot: "Zerar o uso deste bot?",
  confirmAll: "Zerar o uso de todos os bots?",
  confirmAction: "Sim, zerar",
  cancel: "Cancelar",
};

const EN: UsageCopy = {
  title: "Usage per bot",
  description:
    "How many tokens each bot used. The number comes from the provider; when it reports none, nothing is guessed.",
  deviceNote: "It stays in this browser and is not part of the backup.",
  noBots: "No bots yet.",
  noReplies: "No replies counted yet.",
  total: "Total",
  lastSevenDays: "Last 7 days",
  input: "in",
  output: "out",
  replies: (count) => (count === 1 ? "1 reply" : `${count} replies`),
  withoutData: (count) =>
    count === 1
      ? "1 reply without usage data"
      : `${count} replies without usage data`,
  reset: (botName) => `Reset usage of ${botName}`,
  resetAll: "Reset all",
  confirmBot: "Reset this bot's usage?",
  confirmAll: "Reset the usage of all bots?",
  confirmAction: "Yes, reset",
  cancel: "Cancel",
};

const ES: UsageCopy = {
  title: "Uso por bot",
  description:
    "Cuántos tokens usó cada bot. El número viene del proveedor; cuando no lo informa, no se estima nada.",
  deviceNote:
    "Se queda solo en este navegador y no entra en la copia de seguridad.",
  noBots: "Aún no hay bots.",
  noReplies: "Aún no hay respuestas contadas.",
  total: "Total",
  lastSevenDays: "Últimos 7 días",
  input: "entrada",
  output: "salida",
  replies: (count) => (count === 1 ? "1 respuesta" : `${count} respuestas`),
  withoutData: (count) =>
    count === 1
      ? "1 respuesta sin datos de uso"
      : `${count} respuestas sin datos de uso`,
  reset: (botName) => `Reiniciar el uso de ${botName}`,
  resetAll: "Reiniciar todo",
  confirmBot: "¿Reiniciar el uso de este bot?",
  confirmAll: "¿Reiniciar el uso de todos los bots?",
  confirmAction: "Sí, reiniciar",
  cancel: "Cancelar",
};

const USAGE_COPY: Record<ChatLanguage, UsageCopy> = { pt: PT, en: EN, es: ES };

export function getUsageCopy(language: ChatLanguage): UsageCopy {
  return USAGE_COPY[language];
}
