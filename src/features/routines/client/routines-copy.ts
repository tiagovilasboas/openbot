import type { Language } from "../../language/language.ts";
import type { DraftProblem, ScheduleKind } from "./routine-draft.ts";

/** Copy for the routines section of the bot sheet. Trilingual parity. */
export interface RoutinesCopy {
  title: string;
  note: string;
  empty: string;
  add: string;
  edit: string;
  remove: string;
  removeConfirm: string;
  runNow: string;
  running: string;
  save: string;
  cancel: string;
  titleLabel: string;
  titlePlaceholder: string;
  promptLabel: string;
  promptPlaceholder: string;
  scheduleLabel: string;
  kinds: Record<ScheduleKind, string>;
  everyMinutesLabel: string;
  timeLabel: string;
  daysLabel: string;
  timeZone: (zone: string) => string;
  enabledLabel: string;
  silentLabel: string;
  silentHint: string;
  every: (minutes: number) => string;
  dailyAt: (time: string) => string;
  weeklyAt: (days: string, time: string) => string;
  nextRun: (when: string) => string;
  paused: string;
  history: string;
  hideHistory: string;
  historyEmpty: string;
  nothingNew: string;
  manualRun: string;
  failed: (reason: string) => string;
  errors: Record<DraftProblem | "save" | "load" | "run", string>;
}

const PT: RoutinesCopy = {
  title: "Rotinas",
  note: "O bot roda estas tarefas sozinho, no horário marcado, enquanto o Open Bot estiver aberto neste computador. As respostas ficam no histórico de cada rotina.",
  empty: "Nenhuma rotina ainda.",
  add: "Nova rotina",
  edit: "Editar",
  remove: "Excluir",
  removeConfirm: "Excluir de vez",
  runNow: "Rodar agora",
  running: "Rodando…",
  save: "Salvar rotina",
  cancel: "Cancelar",
  titleLabel: "Nome",
  titlePlaceholder: "ex: Resumo da manhã",
  promptLabel: "O que o bot deve fazer",
  promptPlaceholder: "ex: Liste as três notícias de IA mais relevantes de hoje",
  scheduleLabel: "Quando",
  kinds: { interval: "A cada", daily: "Todo dia", weekly: "Dias da semana" },
  everyMinutesLabel: "Intervalo em minutos",
  timeLabel: "Horário",
  daysLabel: "Dias",
  timeZone: (zone) => `Fuso: ${zone}`,
  enabledLabel: "Ativa",
  silentLabel: "Ficar quieto sem novidade",
  silentHint: "Se não houver nada novo, a execução não guarda resposta.",
  every: (m) => (m % 60 === 0 ? `A cada ${m / 60} h` : `A cada ${m} min`),
  dailyAt: (time) => `Todo dia às ${time}`,
  weeklyAt: (days, time) => `${days} às ${time}`,
  nextRun: (when) => `Próxima: ${when}`,
  paused: "Pausada",
  history: "Histórico",
  hideHistory: "Ocultar histórico",
  historyEmpty: "Ainda não rodou.",
  nothingNew: "Sem novidade",
  manualRun: "manual",
  failed: (reason) => `Falhou (${reason})`,
  errors: {
    invalid_title: "Dê um nome à rotina.",
    invalid_prompt: "Diga o que o bot deve fazer.",
    unknown_kind: "Escolha quando a rotina roda.",
    interval_too_short: "O intervalo mínimo é 5 minutos.",
    interval_too_long: "O intervalo máximo é 1 semana.",
    bad_time: "Use um horário como 08:30.",
    bad_time_zone: "Fuso horário inválido.",
    no_days: "Escolha pelo menos um dia.",
    save: "Não deu para salvar. Tente de novo.",
    load: "Não deu para carregar as rotinas.",
    run: "A execução não terminou. Veja o histórico.",
  },
};

const EN: RoutinesCopy = {
  title: "Routines",
  note: "The bot runs these tasks on its own, on schedule, while Open Bot is running on this computer. Replies are kept in each routine's history.",
  empty: "No routines yet.",
  add: "New routine",
  edit: "Edit",
  remove: "Delete",
  removeConfirm: "Delete for good",
  runNow: "Run now",
  running: "Running…",
  save: "Save routine",
  cancel: "Cancel",
  titleLabel: "Name",
  titlePlaceholder: "e.g. Morning brief",
  promptLabel: "What the bot should do",
  promptPlaceholder: "e.g. List today's three most relevant AI news items",
  scheduleLabel: "When",
  kinds: { interval: "Every", daily: "Every day", weekly: "Weekdays" },
  everyMinutesLabel: "Interval in minutes",
  timeLabel: "Time",
  daysLabel: "Days",
  timeZone: (zone) => `Time zone: ${zone}`,
  enabledLabel: "Active",
  silentLabel: "Stay quiet when nothing is new",
  silentHint: "When there is nothing new, the run keeps no reply.",
  every: (m) => (m % 60 === 0 ? `Every ${m / 60} h` : `Every ${m} min`),
  dailyAt: (time) => `Every day at ${time}`,
  weeklyAt: (days, time) => `${days} at ${time}`,
  nextRun: (when) => `Next: ${when}`,
  paused: "Paused",
  history: "History",
  hideHistory: "Hide history",
  historyEmpty: "Has not run yet.",
  nothingNew: "Nothing new",
  manualRun: "manual",
  failed: (reason) => `Failed (${reason})`,
  errors: {
    invalid_title: "Give the routine a name.",
    invalid_prompt: "Say what the bot should do.",
    unknown_kind: "Choose when the routine runs.",
    interval_too_short: "The shortest interval is 5 minutes.",
    interval_too_long: "The longest interval is 1 week.",
    bad_time: "Use a time like 08:30.",
    bad_time_zone: "Invalid time zone.",
    no_days: "Pick at least one day.",
    save: "Could not save. Try again.",
    load: "Could not load the routines.",
    run: "The run did not finish. Check the history.",
  },
};

const ES: RoutinesCopy = {
  title: "Rutinas",
  note: "El bot ejecuta estas tareas solo, a la hora indicada, mientras Open Bot esté abierto en esta computadora. Las respuestas quedan en el historial de cada rutina.",
  empty: "Todavía no hay rutinas.",
  add: "Nueva rutina",
  edit: "Editar",
  remove: "Eliminar",
  removeConfirm: "Eliminar definitivamente",
  runNow: "Ejecutar ahora",
  running: "Ejecutando…",
  save: "Guardar rutina",
  cancel: "Cancelar",
  titleLabel: "Nombre",
  titlePlaceholder: "ej.: Resumen de la mañana",
  promptLabel: "Qué debe hacer el bot",
  promptPlaceholder:
    "ej.: Enumera las tres noticias de IA más relevantes de hoy",
  scheduleLabel: "Cuándo",
  kinds: {
    interval: "Cada",
    daily: "Todos los días",
    weekly: "Días de la semana",
  },
  everyMinutesLabel: "Intervalo en minutos",
  timeLabel: "Hora",
  daysLabel: "Días",
  timeZone: (zone) => `Zona horaria: ${zone}`,
  enabledLabel: "Activa",
  silentLabel: "Callar si no hay novedades",
  silentHint: "Si no hay nada nuevo, la ejecución no guarda respuesta.",
  every: (m) => (m % 60 === 0 ? `Cada ${m / 60} h` : `Cada ${m} min`),
  dailyAt: (time) => `Todos los días a las ${time}`,
  weeklyAt: (days, time) => `${days} a las ${time}`,
  nextRun: (when) => `Próxima: ${when}`,
  paused: "Pausada",
  history: "Historial",
  hideHistory: "Ocultar historial",
  historyEmpty: "Todavía no se ejecutó.",
  nothingNew: "Sin novedades",
  manualRun: "manual",
  failed: (reason) => `Falló (${reason})`,
  errors: {
    invalid_title: "Ponle un nombre a la rutina.",
    invalid_prompt: "Di qué debe hacer el bot.",
    unknown_kind: "Elige cuándo se ejecuta la rutina.",
    interval_too_short: "El intervalo mínimo es de 5 minutos.",
    interval_too_long: "El intervalo máximo es de 1 semana.",
    bad_time: "Usa una hora como 08:30.",
    bad_time_zone: "Zona horaria inválida.",
    no_days: "Elige al menos un día.",
    save: "No se pudo guardar. Inténtalo de nuevo.",
    load: "No se pudieron cargar las rutinas.",
    run: "La ejecución no terminó. Revisa el historial.",
  },
};

const ROUTINES_COPY: Record<Language, RoutinesCopy> = {
  pt: PT,
  en: EN,
  es: ES,
};

export function getRoutinesCopy(language: Language): RoutinesCopy {
  return ROUTINES_COPY[language];
}
