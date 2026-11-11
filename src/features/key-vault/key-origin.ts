import type { ClientModelConfig } from "../model/model-config.ts";
import type { KeyedProvider } from "../model/provider-keys.ts";
import { validateOrigin } from "./vault-validation.ts";

// Pure and safe for the client bundle: no storage, no node modules.

export const ANTHROPIC_ORIGIN = "https://api.anthropic.com";
export const OPENROUTER_ORIGIN = "https://openrouter.ai";

/** The origin a model config's key is for, or null when none can be saved. */
export function keyOriginFor(config: ClientModelConfig): string | null {
  if (config.provider === "local") return null;
  if (config.provider === "anthropic") return ANTHROPIC_ORIGIN;
  const origin = validateOrigin(config.baseUrl);
  return origin.ok ? origin.value : null;
}

/** The key slot a config uses, or null for a provider with no key. */
export function keyProviderOf(config: ClientModelConfig): KeyedProvider | null {
  return config.provider === "local" ? null : config.provider;
}
