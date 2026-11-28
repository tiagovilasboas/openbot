import type { ConnectionId } from "../core/index.ts";

type Lang = "pt" | "en" | "es";

interface OffProviderCopy {
  /** One line under a provider row that cannot be chosen. */
  offReason: string;
  /** In the Model form: why saving is blocked and where to fix it. */
  offFormNotice: string;
  openConnections: string;
  /** In the model picker: its models are not listed. */
  pickerNotice: string;
  /** Where a bot's saved model depends on the provider. */
  modelWarning: string;
}

export const offProviderCopy: Record<Lang, OffProviderCopy> = {
  pt: {
    offReason: "Desativado em Conexões",
    offFormNotice:
      "{provider} está desativado. Ative em Conexões para usar este provedor.",
    openConnections: "Abrir conexões",
    pickerNotice:
      "{provider} está desativado, então os modelos dele não aparecem. Ative em Conexões ou use o modelo padrão.",
    modelWarning:
      "Este modelo usa {provider}, que está desativado. Ative o provedor ou escolha outro modelo.",
  },
  en: {
    offReason: "Switched off in Connections",
    offFormNotice:
      "{provider} is switched off. Switch it on in Connections to use this provider.",
    openConnections: "Open connections",
    pickerNotice:
      "{provider} is switched off, so its models are not listed. Switch it on in Connections or use the default model.",
    modelWarning:
      "This model uses {provider}, which is switched off. Switch the provider on or pick another model.",
  },
  es: {
    offReason: "Desactivado en Conexiones",
    offFormNotice:
      "{provider} está desactivado. Actívalo en Conexiones para usar este proveedor.",
    openConnections: "Abrir conexiones",
    pickerNotice:
      "{provider} está desactivado, así que sus modelos no aparecen. Actívalo en Conexiones o usa el modelo predeterminado.",
    modelWarning:
      "Este modelo usa {provider}, que está desactivado. Activa el proveedor o elige otro modelo.",
  },
};

const NAMES: Record<ConnectionId, string> = {
  router: "OpenRouter",
  anthropic: "Anthropic",
  chatgpt: "ChatGPT",
  github: "GitHub",
};

export function providerName(id: ConnectionId): string {
  return NAMES[id];
}
