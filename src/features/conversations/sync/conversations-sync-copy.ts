import type { Language } from "../../language/language.ts";
import type { ConversationsSyncErrorCode } from "./conversations-sync-failure.ts";

const COPY: Record<Language, Record<ConversationsSyncErrorCode, string>> = {
  pt: {
    too_large:
      "Esta conversa ficou grande demais para salvar no servidor. Ela continua salva só neste navegador; comece uma nova conversa.",
    too_many_threads:
      "O servidor já guarda conversas demais. Apague conversas de bots antigos para salvar esta.",
    unauthorized:
      "Não foi possível salvar a conversa no servidor: acesso negado. Confira o token de acesso.",
    rejected:
      "O servidor não aceitou esta conversa. Ela continua salva só neste navegador.",
  },
  en: {
    too_large:
      "This conversation is too large to save on the server. It stays saved in this browser only; start a new conversation.",
    too_many_threads:
      "The server already holds too many conversations. Delete conversations of old bots to save this one.",
    unauthorized:
      "Could not save the conversation on the server: access denied. Check the access token.",
    rejected:
      "The server refused this conversation. It stays saved in this browser only.",
  },
  es: {
    too_large:
      "Esta conversación es demasiado grande para guardarse en el servidor. Queda guardada solo en este navegador; empieza una nueva.",
    too_many_threads:
      "El servidor ya guarda demasiadas conversaciones. Borra conversaciones de bots antiguos para guardar esta.",
    unauthorized:
      "No se pudo guardar la conversación en el servidor: acceso denegado. Revisa el token de acceso.",
    rejected:
      "El servidor rechazó esta conversación. Queda guardada solo en este navegador.",
  },
};

export function conversationsSyncMessage(
  language: Language,
  code: ConversationsSyncErrorCode,
): string {
  return COPY[language][code];
}
