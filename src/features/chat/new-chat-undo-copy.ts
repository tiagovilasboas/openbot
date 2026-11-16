import type { Language } from "../language/language.ts";

interface NewChatUndoCopy {
  cleared: string;
  undo: string;
}

const COPY: Record<Language, NewChatUndoCopy> = {
  pt: { cleared: "Conversa limpa.", undo: "Desfazer" },
  en: { cleared: "Conversation cleared.", undo: "Undo" },
  es: { cleared: "Conversación borrada.", undo: "Deshacer" },
};

export function getNewChatUndoCopy(language: Language): NewChatUndoCopy {
  return COPY[language];
}
