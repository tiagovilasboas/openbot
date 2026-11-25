import type { Language } from "../language/language.ts";

/** Longest message one bot may hand to another; the routine prompt caps at 4000. */
export const BOT_MESSAGE_MAX_LENGTH = 2_000;

type Copy = {
  /** The visible line of the handoff, also the title of the target's thread. */
  title: (from: string, to: string) => string;
  /** The first line of what the target receives. */
  intro: (from: string) => string;
};

export const BOT_MESSAGE_COPY: Record<Language, Copy> = {
  pt: {
    title: (from, to) => `${from} enviou uma mensagem para ${to}`,
    intro: (from) =>
      `${from} enviou uma mensagem para você. Responda nesta conversa.`,
  },
  en: {
    title: (from, to) => `${from} sent a message to ${to}`,
    intro: (from) => `${from} sent you a message. Answer in this conversation.`,
  },
  es: {
    title: (from, to) => `${from} envió un mensaje a ${to}`,
    intro: (from) =>
      `${from} te envió un mensaje. Responde en esta conversación.`,
  },
};
