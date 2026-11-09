import type { ChatLanguage } from "../chat/respond-to-message.ts";
import type { ConnectionId } from "./connection-catalog.ts";

/** Copy for the Connections tab. Bilingual parity. */
export const connectionsCopy = {
  pt: {
    groupModels: "Modelos de IA",
    groupTools: "Ferramentas",
    connected: "Conectado",
    connect: "Conectar",
    inUse: "Em uso no chat",
    back: "Voltar para conexões",
    connectTitle: "Conectar {name}",
    manageTitle: "{name}",
    storedHere: "A chave fica só neste aparelho.",
    keyLabel: "Chave de API",
    tokenLabel: "Token de acesso",
    getKey: "Criar em {url}",
    testAndConnect: "Testar e conectar",
    testAndSave: "Testar e salvar",
    testing: "Testando...",
    disconnect: "Desconectar",
    emptyKey: "Cole a chave antes de testar.",
    connectedAs: "Conectado como @{user}.",
    connectedOk: "Conectado. A chave funcionou.",
    rejected: "A chave não funcionou: {reason}",
    unauthorized: "o serviço recusou a chave",
    rateLimited: "limite de requisições atingido, tente mais tarde",
    network: "sem resposta do serviço",
    descriptions: {
      router: "Centenas de modelos, inclusive grátis",
      anthropic: "Claude direto na API",
      github: "Issues e pull requests no chat",
    } satisfies Record<ConnectionId, string>,
  },
  en: {
    groupModels: "AI models",
    groupTools: "Tools",
    connected: "Connected",
    connect: "Connect",
    inUse: "In use in chat",
    back: "Back to connections",
    connectTitle: "Connect {name}",
    manageTitle: "{name}",
    storedHere: "The key stays on this device only.",
    keyLabel: "API key",
    tokenLabel: "Access token",
    getKey: "Create one at {url}",
    testAndConnect: "Test and connect",
    testAndSave: "Test and save",
    testing: "Testing...",
    disconnect: "Disconnect",
    emptyKey: "Paste the key before testing.",
    connectedAs: "Connected as @{user}.",
    connectedOk: "Connected. The key works.",
    rejected: "The key didn't work: {reason}",
    unauthorized: "the service refused the key",
    rateLimited: "rate limit reached, try again later",
    network: "the service didn't answer",
    descriptions: {
      router: "Hundreds of models, free ones included",
      anthropic: "Claude straight from the API",
      github: "Issues and pull requests in chat",
    } satisfies Record<ConnectionId, string>,
  },
} as const;

export function getConnectionsCopy(language: ChatLanguage) {
  return connectionsCopy[language];
}
