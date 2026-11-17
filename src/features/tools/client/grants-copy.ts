import type { Language } from "../../language/language.ts";

/** Copy for the always-allow list in Settings, one entry per language. */
export interface GrantsCopy {
  title: string;
  description: string;
  empty: string;
  loadFailed: string;
  actionFailed: string;
  /** {date} is the day the grant was given. */
  grantedOn: string;
  /** {tool} and {bot} name the grant being revoked. */
  revokeOne: string;
  revoke: string;
  revokeAll: string;
  unknownBot: string;
}

export const grantsCopy: Record<Language, GrantsCopy> = {
  pt: {
    title: "Ferramentas sempre permitidas",
    description:
      "Ferramentas que você marcou como Sempre permitir. Ao revogar, o bot volta a pedir permissão na próxima vez.",
    empty: "Nenhuma ferramenta está sempre permitida.",
    loadFailed: "Não foi possível carregar as permissões.",
    actionFailed: "Não foi possível revogar. Tente de novo.",
    grantedOn: "Permitida em {date}",
    revokeOne: "Revogar {tool} para {bot}",
    revoke: "Revogar",
    revokeAll: "Revogar todas",
    unknownBot: "Bot removido",
  },
  en: {
    title: "Always-allowed tools",
    description:
      "Tools you marked as Always allow. After you revoke one, the bot asks again the next time.",
    empty: "No tool is always allowed.",
    loadFailed: "Could not load the permissions.",
    actionFailed: "Could not revoke. Try again.",
    grantedOn: "Allowed on {date}",
    revokeOne: "Revoke {tool} for {bot}",
    revoke: "Revoke",
    revokeAll: "Revoke all",
    unknownBot: "Removed bot",
  },
  es: {
    title: "Herramientas siempre permitidas",
    description:
      "Herramientas que marcaste como Permitir siempre. Al revocar, el bot vuelve a pedir permiso la próxima vez.",
    empty: "Ninguna herramienta está siempre permitida.",
    loadFailed: "No se pudieron cargar los permisos.",
    actionFailed: "No se pudo revocar. Inténtalo de nuevo.",
    grantedOn: "Permitida el {date}",
    revokeOne: "Revocar {tool} para {bot}",
    revoke: "Revocar",
    revokeAll: "Revocar todas",
    unknownBot: "Bot eliminado",
  },
};
