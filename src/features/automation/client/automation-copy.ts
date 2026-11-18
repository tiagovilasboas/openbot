import type { ChatLanguage } from "../../chat/respond-to-message.ts";

/** Copy for the automation token section of Settings. Parity in pt, en, es. */
export const automationCopy = {
  pt: {
    title: "Automação local",
    description:
      "Deixe scripts desta máquina (cron, atalhos) acionarem um bot por HTTP. Só aceita chamadas do próprio computador e exige um token próprio.",
    statusOff: "Desligada: ainda não há token.",
    statusOn: "Ligada: um token está ativo.",
    create: "Criar token",
    rotate: "Gerar novo token",
    revoke: "Revogar token",
    working: "Aguarde...",
    shownOnce:
      "Copie agora: este token não será mostrado de novo. Gerar outro invalida este.",
    tokenLabel: "Seu token",
    copy: "Copiar",
    copied: "Copiado",
    exampleTitle: "Exemplo",
    exampleNote:
      "Troque BOT_ID pelo id do bot. Com senha de acesso do servidor ativa, envie o token no cabeçalho X-Openbot-Automation-Token.",
    revoked: "Token revogado. A rota de automação está desligada.",
    failed: "Não foi possível concluir. Tente novamente.",
  },
  en: {
    title: "Local automation",
    description:
      "Let scripts on this machine (cron, shortcuts) trigger a bot over HTTP. It only accepts calls from this computer and needs its own token.",
    statusOff: "Off: there is no token yet.",
    statusOn: "On: a token is active.",
    create: "Create token",
    rotate: "Generate new token",
    revoke: "Revoke token",
    working: "Please wait...",
    shownOnce:
      "Copy it now: this token will not be shown again. Generating another one invalidates this one.",
    tokenLabel: "Your token",
    copy: "Copy",
    copied: "Copied",
    exampleTitle: "Example",
    exampleNote:
      "Replace BOT_ID with the bot's id. If the server access token is on, send this token in the X-Openbot-Automation-Token header.",
    revoked: "Token revoked. The automation route is off.",
    failed: "Could not finish. Try again.",
  },
  es: {
    title: "Automatización local",
    description:
      "Deja que scripts de esta máquina (cron, atajos) activen un bot por HTTP. Solo acepta llamadas de este equipo y exige su propio token.",
    statusOff: "Apagada: aún no hay token.",
    statusOn: "Encendida: hay un token activo.",
    create: "Crear token",
    rotate: "Generar token nuevo",
    revoke: "Revocar token",
    working: "Espera...",
    shownOnce:
      "Cópialo ahora: este token no se mostrará de nuevo. Generar otro invalida este.",
    tokenLabel: "Tu token",
    copy: "Copiar",
    copied: "Copiado",
    exampleTitle: "Ejemplo",
    exampleNote:
      "Cambia BOT_ID por el id del bot. Si el token de acceso del servidor está activo, envía este token en el encabezado X-Openbot-Automation-Token.",
    revoked: "Token revocado. La ruta de automatización está apagada.",
    failed: "No se pudo completar. Inténtalo de nuevo.",
  },
} as const satisfies Record<ChatLanguage, Record<string, string>>;

export function getAutomationCopy(language: ChatLanguage) {
  return automationCopy[language];
}
