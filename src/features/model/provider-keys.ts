import {
  MODEL_CONFIG_STORAGE_KEY,
  validateClientModelConfig,
  type ClientModelConfig,
} from "./model-config.ts";

/*
 * One saved key per provider, kept apart from the active model config, so
 * switching from OpenRouter to Anthropic and back does not lose a key.
 * Keys stay in this browser's storage, like the model config itself.
 */

export type KeyedProvider = "router" | "anthropic";
export type ProviderKeys = Partial<Record<KeyedProvider, string>>;

export const PROVIDER_KEYS_STORAGE_KEY = "openbot_provider_keys";
export const KEYED_PROVIDERS: readonly KeyedProvider[] = [
  "router",
  "anthropic",
];

const maxKeyLength = 500;

function cleanKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxKeyLength ? trimmed : null;
}

/** Keeps only known providers with a usable key. */
export function sanitizeProviderKeys(data: unknown): ProviderKeys {
  if (typeof data !== "object" || data === null) return {};
  const candidate = data as Record<string, unknown>;
  const keys: ProviderKeys = {};
  for (const provider of KEYED_PROVIDERS) {
    const key = cleanKey(candidate[provider]);
    if (key) keys[provider] = key;
  }
  return keys;
}

/** The keys plus the active config's key, when the keyring lacks it. */
export function seedKeysFromConfig(
  keys: ProviderKeys,
  config: ClientModelConfig | null,
): ProviderKeys {
  if (!config || config.provider === "local" || keys[config.provider]) {
    return keys;
  }
  const key = cleanKey(config.apiKey);
  return key ? { ...keys, [config.provider]: key } : keys;
}

function resolveStorage(storage?: Storage): Storage | undefined {
  if (storage) return storage;
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

function readStoredConfig(s: Storage): ClientModelConfig | null {
  try {
    const raw = s.getItem(MODEL_CONFIG_STORAGE_KEY);
    return raw ? validateClientModelConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * The saved keys. The first read moves the key kept in the model config
 * into the keyring, so keys saved before the keyring existed carry over.
 */
export function loadProviderKeys(storage?: Storage): ProviderKeys {
  try {
    const s = resolveStorage(storage);
    if (!s) return {};
    const raw = s.getItem(PROVIDER_KEYS_STORAGE_KEY);
    if (raw != null) return sanitizeProviderKeys(JSON.parse(raw));
    const seeded = seedKeysFromConfig({}, readStoredConfig(s));
    s.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    return {};
  }
}

/** Saves one provider's key; an empty key removes it. */
export function saveProviderKey(
  provider: KeyedProvider,
  key: string,
  storage?: Storage,
): ProviderKeys {
  const s = resolveStorage(storage);
  const current = loadProviderKeys(s);
  const next: ProviderKeys = { ...current };
  const cleaned = cleanKey(key);
  if (cleaned) next[provider] = cleaned;
  else delete next[provider];
  try {
    s?.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write quota exceptions silently
  }
  return next;
}

export function clearProviderKeys(storage?: Storage): void {
  try {
    resolveStorage(storage)?.setItem(PROVIDER_KEYS_STORAGE_KEY, "{}");
  } catch {
    // Ignore storage exceptions silently
  }
}
