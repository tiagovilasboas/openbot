/*
 * Providers that take a key. The keys themselves live in the server's key
 * vault (src/features/key-vault); the browser only ever held them in the past,
 * under PROVIDER_KEYS_STORAGE_KEY, which is read once to move them there.
 */

export type KeyedProvider = "router" | "anthropic";
export type ProviderKeys = Partial<Record<KeyedProvider, string>>;

/** The old browser keyring. Only the migration reads it now. */
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
