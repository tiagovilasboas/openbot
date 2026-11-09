import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";

/** Copy for the Settings sheet (model, GitHub, tabs). Bilingual parity. */
export const settingsCopy = {
  pt: {
    tabsLabel: "Seções das configurações",
    tabModel: "Modelo",
    tabSkills: "Skills",
    tabSecurity: "Segurança",
    securityActive: "Proteção ativa",
    showSecret: "Mostrar valor",
    hideSecret: "Ocultar valor",
    closeSheet: "Fechar configurações",
    sectionProvider: "Provedor de IA",
    sectionPresets: "Atalhos",
    sectionConnection: "Conexão",
    sectionGitHub: "GitHub",
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
    freeModelsList: "Modelos gratuitos",
    getKey: "Obter chave em openrouter.ai/keys",
    allModels: "Ver todos os modelos",
    testIdle: "Verifique se o modelo responde antes de salvar.",
    testInvalid:
      "Preencha os campos obrigatórios do provedor e teste novamente.",
    githubPublicApi: "API pública ({remaining}/{limit} req/h)",
    githubTokenSet: "Token definido",
    githubTokenUnset: "Sem token",
    githubTokenPlaceholder: "ghp_... ou github_pat_...",
    resetConfirm: "Restaurar tudo?",
    resetConfirmHint:
      "Remove o modelo e o token do GitHub guardados neste dispositivo.",
    resetConfirmAction: "Sim, restaurar",
    cancel: "Cancelar",
  },
  en: {
    tabsLabel: "Settings sections",
    tabModel: "Model",
    tabSkills: "Skills",
    tabSecurity: "Security",
    securityActive: "Protection on",
    showSecret: "Show value",
    hideSecret: "Hide value",
    closeSheet: "Close settings",
    sectionProvider: "AI provider",
    sectionPresets: "Shortcuts",
    sectionConnection: "Connection",
    sectionGitHub: "GitHub",
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
    freeModelsList: "Free models",
    getKey: "Get a key at openrouter.ai/keys",
    allModels: "Browse all models",
    testIdle: "Check that the model answers before saving.",
    testInvalid: "Fill in the provider's required fields and test again.",
    githubPublicApi: "Public API ({remaining}/{limit} req/h)",
    githubTokenSet: "Token set",
    githubTokenUnset: "No token",
    githubTokenPlaceholder: "ghp_... or github_pat_...",
    resetConfirm: "Restore everything?",
    resetConfirmHint:
      "Removes the model and GitHub token stored on this device.",
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
