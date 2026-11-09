import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";

/** Copy for the Settings sheet (model, GitHub, tabs). Bilingual parity. */
export const settingsCopy = {
  pt: {
    tabsLabel: "Seções das configurações",
    tabModel: "Modelo",
    tabConnections: "Conexões",
    tabSecurity: "Segurança",
    securityActive: "Proteção ativa",
    showSecret: "Mostrar valor",
    hideSecret: "Ocultar valor",
    closeSheet: "Fechar configurações",
    sectionLanguage: "Idioma",
    sectionProvider: "Provedor de IA",
    sectionPresets: "Atalhos",
    sectionConnection: "Conexão",
    badgeFree: "Grátis",
    badgeLocal: "Local",
    badgeSelected: "Selecionado",
    presetOpenRouterName: "OpenRouter",
    presetOpenRouterDesc: "Modelos gratuitos na nuvem",
    preset9RouterName: "9Router / OmniRoute",
    preset9RouterDesc: "Roteador local na porta 3000",
    presetOllamaName: "Ollama",
    presetOllamaDesc: "Modelos rodando na sua máquina",
    freeModelsLoading: "Atualizando modelos gratuitos...",
    freeModelsLive: "{count} modelos gratuitos em tempo real",
    freeModelsAccount: "{count} modelos gratuitos na sua conta",
    freeModelsList: "Modelos gratuitos",
    getKey: "Obter chave em openrouter.ai/keys",
    allModels: "Ver todos os modelos",
    showAll: "Ver todos ({count})",
    showFewer: "Mostrar menos",
    testIdle: "Verifique se o modelo responde antes de salvar.",
    testInvalid:
      "Preencha os campos obrigatórios do provedor e teste novamente.",
    keyMissing: "{provider} ainda não está conectada.",
    connectAction: "Conectar",
    resetConfirm: "Restaurar tudo?",
    resetConfirmHint:
      "Remove o modelo e as chaves guardadas neste dispositivo.",
    resetConfirmAction: "Sim, restaurar",
    cancel: "Cancelar",
  },
  en: {
    tabsLabel: "Settings sections",
    tabModel: "Model",
    tabConnections: "Connections",
    tabSecurity: "Security",
    securityActive: "Protection on",
    showSecret: "Show value",
    hideSecret: "Hide value",
    closeSheet: "Close settings",
    sectionLanguage: "Language",
    sectionProvider: "AI provider",
    sectionPresets: "Shortcuts",
    sectionConnection: "Connection",
    badgeFree: "Free",
    badgeLocal: "Local",
    badgeSelected: "Selected",
    presetOpenRouterName: "OpenRouter",
    presetOpenRouterDesc: "Free models in the cloud",
    preset9RouterName: "9Router / OmniRoute",
    preset9RouterDesc: "Local router on port 3000",
    presetOllamaName: "Ollama",
    presetOllamaDesc: "Models running on your machine",
    freeModelsLoading: "Refreshing free models...",
    freeModelsLive: "{count} free models, live",
    freeModelsAccount: "{count} free models on your account",
    freeModelsList: "Free models",
    getKey: "Get a key at openrouter.ai/keys",
    allModels: "Browse all models",
    showAll: "Show all ({count})",
    showFewer: "Show fewer",
    testIdle: "Check that the model answers before saving.",
    testInvalid: "Fill in the provider's required fields and test again.",
    keyMissing: "{provider} isn't connected yet.",
    connectAction: "Connect",
    resetConfirm: "Restore everything?",
    resetConfirmHint: "Removes the model and the keys stored on this device.",
    resetConfirmAction: "Yes, restore",
    cancel: "Cancel",
  },
} as const satisfies Record<ChatLanguage, Record<string, string>>;

export function getSettingsCopy(language: ChatLanguage) {
  return settingsCopy[language];
}

export function fillCopy(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  );
}
