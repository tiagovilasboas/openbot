import type { Language } from "../../language/language.ts";
import type { SyncFailure } from "../../conversations/sync/conversations-sync-types.ts";

/** The failures worth telling the user about, each with its own copy. */
export type UsageSyncErrorCode = "too_large" | "unauthorized" | "rejected";

/**
 * Maps a failed write to what the user should see. A lost connection or a
 * server error stays quiet: the log stays in the browser and the next save
 * or load delivers it. Only a refusal (4xx) is surfaced.
 */
export function usageSyncErrorCode(
  failure: SyncFailure,
): UsageSyncErrorCode | null {
  if (failure.kind === "network") return null;
  if (
    failure.error === "too_many_records" ||
    failure.error === "payload_too_large" ||
    failure.status === 413
  ) {
    return "too_large";
  }
  if (failure.status === 401 || failure.status === 403) return "unauthorized";
  return failure.status >= 400 && failure.status < 500 ? "rejected" : null;
}

const COPY: Record<Language, Record<UsageSyncErrorCode, string>> = {
  pt: {
    too_large:
      "O registro de uso ficou grande demais para salvar no servidor. Ele continua salvo só neste navegador; zere o uso para voltar a sincronizar.",
    unauthorized:
      "Não foi possível salvar o uso no servidor: acesso negado. Confira o token de acesso.",
    rejected:
      "O servidor não aceitou o registro de uso. Ele continua salvo só neste navegador.",
  },
  en: {
    too_large:
      "The usage log is too large to save on the server. It stays saved in this browser only; reset usage to sync again.",
    unauthorized:
      "Could not save usage on the server: access denied. Check the access token.",
    rejected:
      "The server refused the usage log. It stays saved in this browser only.",
  },
  es: {
    too_large:
      "El registro de uso es demasiado grande para guardarse en el servidor. Queda guardado solo en este navegador; reinicia el uso para volver a sincronizar.",
    unauthorized:
      "No se pudo guardar el uso en el servidor: acceso denegado. Revisa el token de acceso.",
    rejected:
      "El servidor rechazó el registro de uso. Queda guardado solo en este navegador.",
  },
};

export function usageSyncMessage(
  language: Language,
  code: UsageSyncErrorCode,
): string {
  return COPY[language][code];
}
