import type { Language } from "../language/language.ts";
export type ModelProviderType = "router" | "local" | "anthropic";

export type RouterConfig = {
  provider: "router";
  baseUrl: string;
  model: string;
  apiKey?: string;
};

export type LocalConfig = {
  provider: "local";
  baseUrl: string;
  model: string;
};

export type AnthropicConfig = {
  provider: "anthropic";
  apiKey?: string;
  model: string;
};

export type ClientModelConfig = RouterConfig | LocalConfig | AnthropicConfig;

export const MODEL_CONFIG_STORAGE_KEY = "openbot_model_config";

const maxUrlLength = 500;
const maxModelLength = 200;
const maxKeyLength = 500;

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateClientModelConfig(
  data: unknown,
): ClientModelConfig | null {
  if (typeof data !== "object" || data === null) return null;
  const candidate = data as Record<string, unknown>;

  const provider = candidate.provider;
  if (provider === "router") {
    if (
      typeof candidate.baseUrl !== "string" ||
      candidate.baseUrl.length > maxUrlLength ||
      !isValidUrl(candidate.baseUrl)
    ) {
      return null;
    }
    if (
      typeof candidate.model !== "string" ||
      !candidate.model.trim() ||
      candidate.model.length > maxModelLength
    ) {
      return null;
    }
    const apiKey =
      typeof candidate.apiKey === "string" && candidate.apiKey.trim().length > 0
        ? candidate.apiKey.trim()
        : undefined;
    if (apiKey && apiKey.length > maxKeyLength) {
      return null;
    }

    return {
      provider: "router",
      baseUrl: candidate.baseUrl.trim(),
      model: candidate.model.trim(),
      ...(apiKey ? { apiKey } : {}),
    };
  }

  if (provider === "local") {
    if (
      typeof candidate.baseUrl !== "string" ||
      candidate.baseUrl.length > maxUrlLength ||
      !isValidUrl(candidate.baseUrl)
    ) {
      return null;
    }
    if (
      typeof candidate.model !== "string" ||
      !candidate.model.trim() ||
      candidate.model.length > maxModelLength
    ) {
      return null;
    }

    return {
      provider: "local",
      baseUrl: candidate.baseUrl.trim(),
      model: candidate.model.trim(),
    };
  }

  if (provider === "anthropic") {
    // The key is optional: the server adds the one saved in its key vault.
    const apiKey =
      typeof candidate.apiKey === "string" && candidate.apiKey.trim().length > 0
        ? candidate.apiKey.trim()
        : undefined;
    if (apiKey && apiKey.length > maxKeyLength) return null;
    if (
      typeof candidate.model !== "string" ||
      !candidate.model.trim() ||
      candidate.model.length > maxModelLength
    ) {
      return null;
    }

    return {
      provider: "anthropic",
      model: candidate.model.trim(),
      ...(apiKey ? { apiKey } : {}),
    };
  }

  return null;
}

/**
 * The config without its key. Keys live in the server's vault, so the copy
 * kept in this browser and sent with requests never carries one.
 */
export function withoutApiKey(config: ClientModelConfig): ClientModelConfig {
  if (config.provider === "local") return config;
  const { apiKey: _key, ...rest } = config;
  return rest;
}

let cachedRaw: string | null = null;
let cachedConfig: ClientModelConfig | null = null;
let listeners: Array<() => void> = [];

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeModelConfig(listener: () => void): () => void {
  listeners.push(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners = listeners.filter((item) => item !== listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

export function loadStoredModelConfig(): ClientModelConfig | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedConfig;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedConfig = null;
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    const validated = validateClientModelConfig(parsed);
    cachedConfig = validated ? withoutApiKey(validated) : null;
    return cachedConfig;
  } catch {
    cachedRaw = null;
    cachedConfig = null;
    return null;
  }
}

export function saveStoredModelConfig(config: ClientModelConfig): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const checked = validateClientModelConfig(config);
    if (checked) {
      const validated = withoutApiKey(checked);
      const serialized = JSON.stringify(validated);
      window.localStorage.setItem(MODEL_CONFIG_STORAGE_KEY, serialized);
      cachedRaw = serialized;
      cachedConfig = validated;
      notifyListeners();
    }
  } catch {
    // Ignore storage write quota exceptions silently
  }
}

export function clearStoredModelConfig(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(MODEL_CONFIG_STORAGE_KEY);
    cachedRaw = null;
    cachedConfig = null;
    notifyListeners();
  } catch {
    // Ignore storage exceptions silently
  }
}

const NO_MODEL_LABEL: Record<Language, string> = {
  pt: "Sem modelo",
  en: "No model",
  es: "Sin modelo",
};

export function formatModelBadge(
  config?: { provider?: string; model?: string } | null,
  isDemo = false,
  language: Language = "pt",
): string {
  if (isDemo || !config?.provider) {
    return NO_MODEL_LABEL[language];
  }

  const providerLabel =
    config.provider === "router"
      ? "Router"
      : config.provider === "local"
        ? "Local"
        : config.provider === "anthropic"
          ? "Anthropic"
          : config.provider;

  if (config.model && config.model.trim()) {
    return `${providerLabel}: ${config.model.trim()}`;
  }

  return providerLabel;
}
