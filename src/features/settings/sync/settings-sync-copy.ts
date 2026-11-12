import type { Language } from "../../language/language.ts";
import type { SettingsSyncErrorCode } from "./settings-sync-failure.ts";

const COPY: Record<Language, Record<SettingsSyncErrorCode, string>> = {
  pt: {
    unauthorized:
      "Não foi possível salvar as preferências no servidor: acesso negado. Confira o token de acesso.",
    rejected:
      "O servidor não aceitou esta preferência. Ela continua salva só neste navegador.",
  },
  en: {
    unauthorized:
      "Could not save your preferences on the server: access denied. Check the access token.",
    rejected:
      "The server refused this preference. It stays saved in this browser only.",
  },
  es: {
    unauthorized:
      "No se pudieron guardar las preferencias en el servidor: acceso denegado. Revisa el token de acceso.",
    rejected:
      "El servidor rechazó esta preferencia. Sigue guardada solo en este navegador.",
  },
};

export function settingsSyncMessage(
  language: Language,
  code: SettingsSyncErrorCode,
): string {
  return COPY[language][code];
}
