import type { ModelRequest } from "../model/model-adapter.ts";
import {
  externalDataRule,
  wrapExternalText,
  type ExternalTextLanguage,
} from "../untrusted-text/wrap-external-text.ts";
import {
  SUGGESTION_MAX_DESCRIPTION,
  SUGGESTION_MAX_INSTRUCTIONS,
  SUGGESTION_MAX_NAME,
} from "./suggestion-limits.ts";

const TASK: Record<ExternalTextLanguage, string> = {
  pt: `Abaixo estão mensagens que um usuário enviou a um assistente, da mais antiga para a mais recente. Encontre UM jeito de trabalhar que se repete nelas e proponha uma skill que o capture: um conjunto reutilizável de instruções para o assistente.
Responda SOMENTE com um objeto JSON, sem texto antes ou depois e sem cercas de código, com exatamente estes campos de texto: "name" (até ${SUGGESTION_MAX_NAME} caracteres), "description" (uma frase, até ${SUGGESTION_MAX_DESCRIPTION}), "instructions" (instruções diretas ao assistente, até ${SUGGESTION_MAX_INSTRUCTIONS} caracteres).
Escreva no idioma das mensagens. Se nada se repete, proponha a skill mais útil que o conjunto sugere.`,
  en: `Below are messages a user sent to an assistant, oldest first. Find ONE way of working that repeats across them and propose a skill that captures it: a reusable set of instructions for the assistant.
Reply with ONLY a JSON object, no text before or after and no code fences, with exactly these text fields: "name" (up to ${SUGGESTION_MAX_NAME} characters), "description" (one sentence, up to ${SUGGESTION_MAX_DESCRIPTION}), "instructions" (direct instructions to the assistant, up to ${SUGGESTION_MAX_INSTRUCTIONS} characters).
Write in the language of the messages. If nothing repeats, propose the most useful skill the set suggests.`,
  es: `A continuación hay mensajes que un usuario envió a un asistente, del más antiguo al más reciente. Encuentra UNA forma de trabajar que se repita en ellos y propón una skill que la capture: un conjunto reutilizable de instrucciones para el asistente.
Responde SOLO con un objeto JSON, sin texto antes ni después y sin bloques de código, con exactamente estos campos de texto: "name" (hasta ${SUGGESTION_MAX_NAME} caracteres), "description" (una frase, hasta ${SUGGESTION_MAX_DESCRIPTION}), "instructions" (instrucciones directas al asistente, hasta ${SUGGESTION_MAX_INSTRUCTIONS} caracteres).
Escribe en el idioma de los mensajes. Si nada se repite, propón la skill más útil que sugiera el conjunto.`,
};

/** The system prompt: the task and the rule that the messages are data. */
export function buildSuggestionSystemPrompt(
  language: ExternalTextLanguage,
): string {
  return `${TASK[language]}\n${externalDataRule(language)}`;
}

/**
 * The user's messages as one numbered list inside the external-data
 * delimiter. Every message is already a single line, and the wrapper
 * defuses any tag a message uses to close it early.
 */
export function buildSuggestionHistory(messages: readonly string[]): string {
  const lines = messages.map((text, index) => `${index + 1}. ${text}`);
  return wrapExternalText(lines.join("\n"));
}

/** The one model call for a suggestion: instruction plus the data. */
export function buildSuggestionRequest(
  language: ExternalTextLanguage,
  messages: readonly string[],
  extra: Pick<ModelRequest, "config" | "modelId"> = {},
): ModelRequest {
  return {
    language,
    messages: [{ role: "user", text: buildSuggestionHistory(messages) }],
    systemPrompt: buildSuggestionSystemPrompt(language),
    ...extra,
  };
}
