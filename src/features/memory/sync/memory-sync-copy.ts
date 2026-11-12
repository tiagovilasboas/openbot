import type { Language } from "../../language/language.ts";
import type { MemorySyncErrorCode } from "./memory-sync-failure.ts";

const COPY: Record<Language, Record<MemorySyncErrorCode, string>> = {
  pt: {
    too_large:
      "As notas deste bot ficaram grandes demais para salvar no servidor. Elas continuam salvas só neste navegador; apague algumas.",
    too_many_bots:
      "O servidor já guarda notas de bots demais. Apague as notas de bots antigos para salvar estas.",
    unauthorized:
      "Não foi possível salvar as notas no servidor: acesso negado. Confira o token de acesso.",
    rejected:
      "O servidor não aceitou estas notas. Elas continuam salvas só neste navegador.",
  },
  en: {
    too_large:
      "This bot's notes are too large to save on the server. They stay saved in this browser only; delete some.",
    too_many_bots:
      "The server already holds notes for too many bots. Delete the notes of old bots to save these.",
    unauthorized:
      "Could not save the notes on the server: access denied. Check the access token.",
    rejected:
      "The server refused these notes. They stay saved in this browser only.",
  },
  es: {
    too_large:
      "Las notas de este bot son demasiado grandes para guardarse en el servidor. Quedan guardadas solo en este navegador; borra algunas.",
    too_many_bots:
      "El servidor ya guarda notas de demasiados bots. Borra las notas de bots antiguos para guardar estas.",
    unauthorized:
      "No se pudieron guardar las notas en el servidor: acceso denegado. Revisa el token de acceso.",
    rejected:
      "El servidor rechazó estas notas. Quedan guardadas solo en este navegador.",
  },
};

export function memorySyncMessage(
  language: Language,
  code: MemorySyncErrorCode,
): string {
  return COPY[language][code];
}
