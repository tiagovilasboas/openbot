import type { ChatLanguage } from "../chat/respond-to-message.ts";

interface CrewRoomCopy {
  open: string;
  title: string;
  subtitle: (steps: number) => string;
  close: string;
  kickoffHeading: string;
  stepsHeading: string;
  synthesisHeading: string;
  taskLabel: string;
  statusDone: string;
  statusFailed: string;
  showReply: string;
  hideReply: string;
  /** Read by screen readers as the step's position, "Step 1 of 3". */
  stepOf: (position: number, total: number) => string;
  durationLabel: string;
  noTask: string;
}

/** Text of the team room, in every supported language. */
export const crewRoomCopy: Record<ChatLanguage, CrewRoomCopy> = {
  pt: {
    open: "Sala da equipe",
    title: "Sala da equipe",
    subtitle: (steps) =>
      steps === 1
        ? "1 especialista foi acionado nesta resposta."
        : `${steps} especialistas foram acionados nesta resposta.`,
    close: "Fechar a sala da equipe",
    kickoffHeading: "O que o Chief disse",
    stepsHeading: "Passos, em ordem",
    synthesisHeading: "Resposta final do Chief",
    taskLabel: "Tarefa recebida",
    statusDone: "Respondeu",
    statusFailed: "Não respondeu",
    showReply: "Ver resposta",
    hideReply: "Ocultar resposta",
    stepOf: (position, total) => `Passo ${position} de ${total}`,
    durationLabel: "Tempo",
    noTask: "A tarefa não foi guardada nesta conversa antiga.",
  },
  en: {
    open: "Team room",
    title: "Team room",
    subtitle: (steps) =>
      steps === 1
        ? "1 specialist was asked in this reply."
        : `${steps} specialists were asked in this reply.`,
    close: "Close the team room",
    kickoffHeading: "What the Chief said",
    stepsHeading: "Steps, in order",
    synthesisHeading: "The Chief's final answer",
    taskLabel: "Task given",
    statusDone: "Answered",
    statusFailed: "Did not answer",
    showReply: "Show reply",
    hideReply: "Hide reply",
    stepOf: (position, total) => `Step ${position} of ${total}`,
    durationLabel: "Time",
    noTask: "The task was not saved in this older conversation.",
  },
  es: {
    open: "Sala del equipo",
    title: "Sala del equipo",
    subtitle: (steps) =>
      steps === 1
        ? "Se consultó a 1 especialista en esta respuesta."
        : `Se consultó a ${steps} especialistas en esta respuesta.`,
    close: "Cerrar la sala del equipo",
    kickoffHeading: "Lo que dijo el Chief",
    stepsHeading: "Pasos, en orden",
    synthesisHeading: "Respuesta final del Chief",
    taskLabel: "Tarea recibida",
    statusDone: "Respondió",
    statusFailed: "No respondió",
    showReply: "Ver respuesta",
    hideReply: "Ocultar respuesta",
    stepOf: (position, total) => `Paso ${position} de ${total}`,
    durationLabel: "Tiempo",
    noTask: "La tarea no se guardó en esta conversación antigua.",
  },
};
