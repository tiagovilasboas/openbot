import type { Language } from "../../language/language.ts";
import type { BotsSyncErrorCode } from "./bots-sync-failure.ts";

const COPY: Record<Language, Record<BotsSyncErrorCode, string>> = {
  pt: {
    main_bot_required:
      "O servidor não aceitou a mudança: o bot principal não pode sair da lista.",
    payload_too_large:
      "Seus bots ficaram grandes demais para salvar no servidor. Reduza instruções ou skills.",
    unauthorized:
      "Não foi possível salvar os bots no servidor: acesso negado. Confira o token de acesso.",
    rejected:
      "O servidor não aceitou esta alteração. Ela continua salva só neste navegador.",
  },
  en: {
    main_bot_required:
      "The server refused the change: the main bot cannot leave the list.",
    payload_too_large:
      "Your bots are too large to save on the server. Shorten instructions or skills.",
    unauthorized:
      "Could not save your bots on the server: access denied. Check the access token.",
    rejected:
      "The server refused this change. It stays saved in this browser only.",
  },
  es: {
    main_bot_required:
      "El servidor rechazó el cambio: el bot principal no puede salir de la lista.",
    payload_too_large:
      "Tus bots son demasiado grandes para guardarse en el servidor. Acorta instrucciones o skills.",
    unauthorized:
      "No se pudieron guardar los bots en el servidor: acceso denegado. Revisa el token de acceso.",
    rejected:
      "El servidor rechazó este cambio. Queda guardado solo en este navegador.",
  },
};

export function botsSyncMessage(
  language: Language,
  code: BotsSyncErrorCode,
): string {
  return COPY[language][code];
}
