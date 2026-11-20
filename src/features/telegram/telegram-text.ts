// Message shaping for Telegram. Pure.

/** Telegram refuses messages over 4096 characters. */
export const TELEGRAM_MAX_CHARS = 4096;
/** Longest incoming text sent to the model. */
export const TELEGRAM_MAX_PROMPT = 4000;

/**
 * Splits a reply into messages Telegram accepts, at a paragraph or line
 * break when one is near the limit, else at a space, else hard.
 */
export function splitForTelegram(
  text: string,
  limit = TELEGRAM_MAX_CHARS,
): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const floor = Math.floor(limit / 2);
    let cut = window.lastIndexOf("\n\n");
    if (cut < floor) cut = window.lastIndexOf("\n");
    if (cut < floor) cut = window.lastIndexOf(" ");
    if (cut < floor) cut = limit;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}

export type IncomingCommand = "start" | "new" | null;

/** "/start" and "/new" (also "/new@MyBot"); anything else is a message. */
export function commandOf(text: string): IncomingCommand {
  const match = /^\/(start|new)(?:@\w+)?\s*$/i.exec(text.trim());
  return match ? (match[1].toLowerCase() as IncomingCommand) : null;
}

const NOTES = {
  pt: {
    start: (id: string) =>
      `Este chat é o ${id}. Se ele estiver em TELEGRAM_ALLOWED_CHATS, é só escrever.`,
    reset: "Conversa nova. O que já foi dito aqui não entra mais no contexto.",
    failed: "Não consegui responder agora. Tente de novo em instantes.",
    busy: "Ainda estou respondendo a mensagem anterior.",
  },
  en: {
    start: (id: string) =>
      `This chat is ${id}. If it is in TELEGRAM_ALLOWED_CHATS, just write.`,
    reset:
      "New conversation. What was said here no longer goes in the context.",
    failed: "Could not answer right now. Try again in a moment.",
    busy: "Still answering the previous message.",
  },
  es: {
    start: (id: string) =>
      `Este chat es el ${id}. Si está en TELEGRAM_ALLOWED_CHATS, solo escribe.`,
    reset: "Conversación nueva. Lo dicho aquí ya no entra en el contexto.",
    failed: "No pude responder ahora. Inténtalo de nuevo en un momento.",
    busy: "Todavía respondo el mensaje anterior.",
  },
} as const;

export function telegramNotes(language: keyof typeof NOTES) {
  return NOTES[language];
}
