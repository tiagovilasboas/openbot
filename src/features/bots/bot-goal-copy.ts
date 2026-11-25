import type { Language } from "../language/language.ts";
import type { GoalStatus } from "./bot-goal.ts";

interface BotGoalCopy {
  section: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  statusLabel: string;
  statuses: Record<GoalStatus, string>;
  progressLabel: string;
  progressPlaceholder: string;
  helper: string;
}

const BOT_GOAL_COPY: Record<Language, BotGoalCopy> = {
  pt: {
    section: "Objetivo",
    titleLabel: "Objetivo",
    titlePlaceholder: "Ex.: Fechar o relatório do trimestre",
    descriptionLabel: "Detalhes (opcional)",
    descriptionPlaceholder: "O que significa concluir este objetivo?",
    statusLabel: "Situação",
    statuses: { active: "Ativo", paused: "Pausado", done: "Concluído" },
    progressLabel: "Progresso",
    progressPlaceholder: "Ex.: Dados coletados, falta revisar",
    helper:
      "Enquanto estiver ativo, o agente leva este objetivo em conta nas respostas. Deixe o título vazio para remover.",
  },
  en: {
    section: "Goal",
    titleLabel: "Goal",
    titlePlaceholder: "E.g. Finish the quarterly report",
    descriptionLabel: "Details (optional)",
    descriptionPlaceholder: "What does finishing this goal mean?",
    statusLabel: "Status",
    statuses: { active: "Active", paused: "Paused", done: "Done" },
    progressLabel: "Progress",
    progressPlaceholder: "E.g. Data collected, review left",
    helper:
      "While active, the agent keeps this goal in mind when it replies. Leave the title empty to remove it.",
  },
  es: {
    section: "Objetivo",
    titleLabel: "Objetivo",
    titlePlaceholder: "Ej.: Cerrar el informe del trimestre",
    descriptionLabel: "Detalles (opcional)",
    descriptionPlaceholder: "¿Qué significa completar este objetivo?",
    statusLabel: "Estado",
    statuses: { active: "Activo", paused: "En pausa", done: "Completado" },
    progressLabel: "Progreso",
    progressPlaceholder: "Ej.: Datos reunidos, falta revisar",
    helper:
      "Mientras esté activo, el agente tiene este objetivo en cuenta al responder. Deja el título vacío para quitarlo.",
  },
};

export function getBotGoalCopy(language: Language): BotGoalCopy {
  return BOT_GOAL_COPY[language];
}
