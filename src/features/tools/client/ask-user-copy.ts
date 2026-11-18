import type { Language } from "../../language/language.ts";

/** Copy for the ask_user card and its answered trace, one entry per language. */
interface AskUserCopy {
  title: string;
  optionsLabel: string;
  freeTextLabel: string;
  freeTextPlaceholder: string;
  send: string;
  skip: string;
  /** Read-only line of an answered question: "{answer}" is the answer. */
  answered: string;
}

export const askUserCopy: Record<Language, AskUserCopy> = {
  pt: {
    title: "O bot tem uma pergunta",
    optionsLabel: "Respostas",
    freeTextLabel: "Ou escreva sua resposta",
    freeTextPlaceholder: "Sua resposta",
    send: "Enviar",
    skip: "Pular",
    answered: "Você respondeu: {answer}",
  },
  en: {
    title: "The bot has a question",
    optionsLabel: "Answers",
    freeTextLabel: "Or write your answer",
    freeTextPlaceholder: "Your answer",
    send: "Send",
    skip: "Skip",
    answered: "You answered: {answer}",
  },
  es: {
    title: "El bot tiene una pregunta",
    optionsLabel: "Respuestas",
    freeTextLabel: "O escribe tu respuesta",
    freeTextPlaceholder: "Tu respuesta",
    send: "Enviar",
    skip: "Omitir",
    answered: "Respondiste: {answer}",
  },
};
