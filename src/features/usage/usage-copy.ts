import type { ChatLanguage } from "../chat/respond-to-message.ts";

/** Copy for the Usage tab of Settings. Bilingual parity. */
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

export function getUsageCopy(language: ChatLanguage): UsageCopy {
  return language === "pt" ? PT : EN;
}
