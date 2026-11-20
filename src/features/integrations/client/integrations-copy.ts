import type { Language } from "../../language/language.ts";

interface IntegrationsCopy {
  title: string;
  note: string;
  loading: string;
  failed: string;
  refresh: string;
  mcpTitle: string;
  mcpNone: string;
  mcpConfigError: (error: string) => string;
  mcpTools: (count: number) => string;
  mcpError: (code: string) => string;
  telegramTitle: string;
  telegramOn: (chats: number) => string;
  telegramOff: string;
  telegramProblem: (problem: string) => string;
}

const COPY: Record<Language, IntegrationsCopy> = {
  pt: {
    title: "Integrações do servidor",
    note: "Configuradas nas variáveis de ambiente do servidor (veja .env.example). Aqui só aparece o estado, nunca tokens.",
    loading: "Verificando…",
    failed: "Não foi possível ler o estado.",
    refresh: "Verificar de novo",
    mcpTitle: "Servidores MCP",
    mcpNone: "Nenhum servidor em OPENBOT_MCP_SERVERS.",
    mcpConfigError: (e) => `OPENBOT_MCP_SERVERS com problema: ${e}`,
    mcpTools: (n) => (n === 1 ? "1 ferramenta" : `${n} ferramentas`),
    mcpError: (c) => `Fora do ar (${c})`,
    telegramTitle: "Telegram",
    telegramOn: (n) =>
      n === 1 ? "Ligado para 1 chat" : `Ligado para ${n} chats`,
    telegramOff:
      "Desligado. Defina TELEGRAM_BOT_TOKEN e TELEGRAM_ALLOWED_CHATS.",
    telegramProblem: (p) => `Desligado (${p})`,
  },
  en: {
    title: "Server integrations",
    note: "Set in the server's environment variables (see .env.example). Only their state shows here, never tokens.",
    loading: "Checking…",
    failed: "Could not read the state.",
    refresh: "Check again",
    mcpTitle: "MCP servers",
    mcpNone: "No server in OPENBOT_MCP_SERVERS.",
    mcpConfigError: (e) => `OPENBOT_MCP_SERVERS has a problem: ${e}`,
    mcpTools: (n) => (n === 1 ? "1 tool" : `${n} tools`),
    mcpError: (c) => `Down (${c})`,
    telegramTitle: "Telegram",
    telegramOn: (n) => (n === 1 ? "On for 1 chat" : `On for ${n} chats`),
    telegramOff: "Off. Set TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_CHATS.",
    telegramProblem: (p) => `Off (${p})`,
  },
  es: {
    title: "Integraciones del servidor",
    note: "Se configuran en las variables de entorno del servidor (ver .env.example). Aquí solo se ve el estado, nunca tokens.",
    loading: "Comprobando…",
    failed: "No se pudo leer el estado.",
    refresh: "Comprobar de nuevo",
    mcpTitle: "Servidores MCP",
    mcpNone: "Ningún servidor en OPENBOT_MCP_SERVERS.",
    mcpConfigError: (e) => `OPENBOT_MCP_SERVERS tiene un problema: ${e}`,
    mcpTools: (n) => (n === 1 ? "1 herramienta" : `${n} herramientas`),
    mcpError: (c) => `Caído (${c})`,
    telegramTitle: "Telegram",
    telegramOn: (n) =>
      n === 1 ? "Activo para 1 chat" : `Activo para ${n} chats`,
    telegramOff: "Apagado. Define TELEGRAM_BOT_TOKEN y TELEGRAM_ALLOWED_CHATS.",
    telegramProblem: (p) => `Apagado (${p})`,
  },
};

export function getIntegrationsCopy(language: Language): IntegrationsCopy {
  return COPY[language];
}
