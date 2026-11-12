import type { Language } from "../../language/language.ts";

/** Copy for the tool turn: approvals, steps and notices. */
interface ToolsCopy {
  /** Stands in for a reply when a paused turn expired before any text. */
  expiredNote: string;
}

export const toolsCopy: Record<Language, ToolsCopy> = {
  pt: {
    expiredNote:
      "O pedido para usar uma ferramenta expirou. Envie a mensagem de novo se ainda precisar.",
  },
  en: {
    expiredNote:
      "The request to use a tool expired. Send the message again if you still need it.",
  },
  es: {
    expiredNote:
      "La solicitud para usar una herramienta caducó. Envía el mensaje de nuevo si aún lo necesitas.",
  },
};
