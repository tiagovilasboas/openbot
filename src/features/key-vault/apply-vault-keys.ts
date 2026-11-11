import type { ClientModelConfig } from "../model/model-config.ts";
import type { ModelRequest } from "../model/model-adapter.ts";
import type { KeyedProvider } from "../model/provider-keys.ts";
import { keyOriginFor, keyProviderOf } from "./key-origin.ts";

/**
 * Port to the key vault: the key saved for a provider, only when it was
 * saved for exactly this origin. Implemented by vault-key-lookup.ts.
 */
export type KeyLookup = (
  provider: KeyedProvider,
  origin: string,
) => string | undefined;

export const noKeyLookup: KeyLookup = () => undefined;

/**
 * Adds the vault key to a config that has none. A key the request carries
 * (a key being tested before it is saved) is left alone. No key is added
 * for a local config or for an origin the key was not saved for.
 */
export function withVaultKey(
  config: ClientModelConfig,
  lookup: KeyLookup,
): ClientModelConfig {
  if (config.provider === "local" || config.apiKey) return config;
  const provider = keyProviderOf(config);
  const origin = keyOriginFor(config);
  if (!provider || !origin) return config;
  const key = lookup(provider, origin);
  return key ? { ...config, apiKey: key } : config;
}

export function withVaultKeys(
  request: ModelRequest,
  lookup: KeyLookup,
): ModelRequest {
  return {
    ...request,
    ...(request.config ? { config: withVaultKey(request.config, lookup) } : {}),
    ...(request.fallbackConfig
      ? { fallbackConfig: withVaultKey(request.fallbackConfig, lookup) }
      : {}),
  };
}
