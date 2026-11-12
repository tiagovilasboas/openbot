import type { Language } from "../../language/language.ts";
import type { ToolStep } from "./tool-steps.ts";

type StepStatusLabels = Record<
  ToolStep["status"] | "running" | "pending",
  string
>;

/** Copy for the tool turn: approvals, steps, notices and the bot option. */
interface ToolsCopy {
  /** Stands in for a reply when a paused turn expired before any text. */
  expiredNote: string;
  approvalTitle: string;
  /** The tools by name, in plain words; unknown ones use `unknownTool`. */
  toolNames: { memory_add_note: string; github_list_open_items: string };
  unknownTool: string;
  previewLabel: string;
  allowOnce: string;
  allowAlways: string;
  deny: string;
  /** {time} is the local clock time the request expires. */
  expiresAt: string;
  stepsLabel: string;
  stepStatus: StepStatusLabels;
  activityTool: string;
  unavailableNotice: string;
  toggleLabel: string;
  toggleHint: string;
}

export const toolsCopy: Record<Language, ToolsCopy> = {
  pt: {
    expiredNote:
      "O pedido para usar uma ferramenta expirou. Envie a mensagem de novo se ainda precisar.",
    approvalTitle: "O bot quer usar uma ferramenta",
    toolNames: {
      memory_add_note: "Salvar uma nota na memória",
      github_list_open_items: "Ler issues e PRs abertos no GitHub",
    },
    unknownTool: "Usar uma ferramenta",
    previewLabel: "O que será usado",
    allowOnce: "Permitir uma vez",
    allowAlways: "Sempre permitir",
    deny: "Negar",
    expiresAt: "Expira às {time}",
    stepsLabel: "Ferramentas usadas",
    stepStatus: {
      ok: "feito",
      error: "falhou",
      denied: "negado",
      expired: "expirou",
      running: "em uso",
      pending: "aguardando",
    },
    activityTool: "Usando uma ferramenta…",
    unavailableNotice:
      "Este modelo não usa ferramentas; a resposta veio sem elas.",
    toggleLabel: "Ferramentas",
    toggleHint:
      "Deixa o bot salvar notas e ler o GitHub; ações que mudam algo pedem sua permissão.",
  },
  en: {
    expiredNote:
      "The request to use a tool expired. Send the message again if you still need it.",
    approvalTitle: "The bot wants to use a tool",
    toolNames: {
      memory_add_note: "Save a note to memory",
      github_list_open_items: "Read open GitHub issues and PRs",
    },
    unknownTool: "Use a tool",
    previewLabel: "What it will use",
    allowOnce: "Allow once",
    allowAlways: "Always allow",
    deny: "Deny",
    expiresAt: "Expires at {time}",
    stepsLabel: "Tools used",
    stepStatus: {
      ok: "done",
      error: "failed",
      denied: "denied",
      expired: "expired",
      running: "running",
      pending: "waiting",
    },
    activityTool: "Using a tool…",
    unavailableNotice:
      "This model does not use tools; the reply came without them.",
    toggleLabel: "Tools",
    toggleHint:
      "Lets the bot save notes and read GitHub; actions that change something ask you first.",
  },
  es: {
    expiredNote:
      "La solicitud para usar una herramienta caducó. Envía el mensaje de nuevo si aún lo necesitas.",
    approvalTitle: "El bot quiere usar una herramienta",
    toolNames: {
      memory_add_note: "Guardar una nota en la memoria",
      github_list_open_items: "Leer issues y PR abiertos en GitHub",
    },
    unknownTool: "Usar una herramienta",
    previewLabel: "Lo que usará",
    allowOnce: "Permitir una vez",
    allowAlways: "Permitir siempre",
    deny: "Denegar",
    expiresAt: "Caduca a las {time}",
    stepsLabel: "Herramientas usadas",
    stepStatus: {
      ok: "hecho",
      error: "falló",
      denied: "denegado",
      expired: "caducó",
      running: "en uso",
      pending: "esperando",
    },
    activityTool: "Usando una herramienta…",
    unavailableNotice:
      "Este modelo no usa herramientas; la respuesta llegó sin ellas.",
    toggleLabel: "Herramientas",
    toggleHint:
      "Permite al bot guardar notas y leer GitHub; las acciones que cambian algo te piden permiso.",
  },
};

/** A tool's name in plain words for the user. */
export function toolLabel(name: string, language: Language): string {
  const copy = toolsCopy[language];
  return Object.hasOwn(copy.toolNames, name)
    ? copy.toolNames[name as keyof ToolsCopy["toolNames"]]
    : copy.unknownTool;
}
