import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";

/** Copy for "suggest a skill from this bot's chats". One entry per language. */
export const suggestionCopy = {
  pt: {
    action: "Sugerir uma skill a partir das conversas deste bot",
    hint: "Lê suas últimas mensagens para este bot e propõe uma skill. Nada é adicionado sem você aceitar.",
    thinking: "Lendo suas conversas…",
    cancel: "Cancelar",
    draftTitle: "Skill sugerida",
    draftWarning:
      "Escrita pelo modelo a partir das suas mensagens: leia as instruções antes de adicionar.",
    commandLabel: "Comando",
    instructionsLabel: "Instruções",
    accept: "Adicionar skill",
    discard: "Descartar",
    retry: "Tentar de novo",
    notEnoughHistory:
      "Ainda há poucas conversas: envie pelo menos {min} mensagens a este bot e tente de novo.",
    invalidSuggestion:
      "O modelo não devolveu uma skill utilizável. Tente de novo.",
  },
  en: {
    action: "Suggest a skill from this bot's chats",
    hint: "Reads your latest messages to this bot and proposes one skill. Nothing is added unless you accept.",
    thinking: "Reading your chats…",
    cancel: "Cancel",
    draftTitle: "Suggested skill",
    draftWarning:
      "Written by the model from your messages: read the instructions before adding it.",
    commandLabel: "Command",
    instructionsLabel: "Instructions",
    accept: "Add skill",
    discard: "Discard",
    retry: "Try again",
    notEnoughHistory:
      "Not enough chats yet: send this bot at least {min} messages and try again.",
    invalidSuggestion: "The model did not return a usable skill. Try again.",
  },
  es: {
    action: "Sugerir una skill a partir de las conversaciones de este bot",
    hint: "Lee tus últimos mensajes a este bot y propone una skill. No se agrega nada sin que la aceptes.",
    thinking: "Leyendo tus conversaciones…",
    cancel: "Cancelar",
    draftTitle: "Skill sugerida",
    draftWarning:
      "Escrita por el modelo a partir de tus mensajes: lee las instrucciones antes de agregarla.",
    commandLabel: "Comando",
    instructionsLabel: "Instrucciones",
    accept: "Agregar skill",
    discard: "Descartar",
    retry: "Intentar de nuevo",
    notEnoughHistory:
      "Todavía hay pocas conversaciones: envía al menos {min} mensajes a este bot e inténtalo de nuevo.",
    invalidSuggestion:
      "El modelo no devolvió una skill utilizable. Inténtalo de nuevo.",
  },
} as const satisfies Record<ChatLanguage, Record<string, string>>;

export type SuggestionCopy = (typeof suggestionCopy)[ChatLanguage];

export function getSuggestionCopy(language: ChatLanguage): SuggestionCopy {
  return suggestionCopy[language];
}
