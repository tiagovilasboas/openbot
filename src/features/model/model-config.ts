export type ModelProviderType = "router" | "local" | "anthropic" | "sandbox";

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
  apiKey: string;
  model: string;
};

export type SandboxConfig = {
  provider: "sandbox";
  model: string;
};

export type ClientModelConfig =
  RouterConfig | LocalConfig | AnthropicConfig | SandboxConfig;

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
    if (
      typeof candidate.apiKey !== "string" ||
      !candidate.apiKey.trim() ||
      candidate.apiKey.length > maxKeyLength
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
      provider: "anthropic",
      apiKey: candidate.apiKey.trim(),
      model: candidate.model.trim(),
    };
  }

  if (provider === "sandbox") {
    const model =
      typeof candidate.model === "string" && candidate.model.trim()
        ? candidate.model.trim()
        : "chief-sim-v1";
    if (model.length > maxModelLength) {
      return null;
    }
    return {
      provider: "sandbox",
      model,
    };
  }

  return null;
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
    cachedConfig = validateClientModelConfig(parsed);
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
    const validated = validateClientModelConfig(config);
    if (validated) {
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

export function formatModelBadge(
  config?: { provider?: string; model?: string } | null,
  isDemo = false,
  language: "pt" | "en" = "pt",
): string {
  if (isDemo || !config?.provider) {
    return language === "pt" ? "Modo Demo" : "Demo Mode";
  }

  const providerLabel =
    config.provider === "router"
      ? "Router"
      : config.provider === "local"
        ? "Local"
        : config.provider === "anthropic"
          ? "Anthropic"
          : config.provider === "sandbox"
            ? language === "pt"
              ? "Simulador"
              : "Sandbox"
            : config.provider;

  if (config.model && config.model.trim()) {
    return `${providerLabel}: ${config.model.trim()}`;
  }

  return providerLabel;
}
