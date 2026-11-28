import type { ClientModelConfig } from "../../model/model-config.ts";
import { isOpenRouterUrl } from "./openrouter-url.ts";

export type ModelConnectionId = "router" | "anthropic" | "chatgpt";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_FREE_MODEL = "openrouter/free";
export const ANTHROPIC_DEFAULT_MODEL = "claude-haiku-5-5";
export const CHATGPT_DEFAULT_MODEL = "gpt-4o";

function isOpenRouter(config: ClientModelConfig): boolean {
  return config.provider === "router" && isOpenRouterUrl(config.baseUrl);
}

/** The model a freshly connected provider starts on. */
function defaultConfigFor(id: ModelConnectionId): ClientModelConfig {
  if (id === "router") {
    return {
      provider: "router",
      baseUrl: OPENROUTER_URL,
      model: OPENROUTER_FREE_MODEL,
    };
  }
  if (id === "chatgpt") {
    return { provider: "chatgpt", model: CHATGPT_DEFAULT_MODEL };
  }
  return { provider: "anthropic", model: ANTHROPIC_DEFAULT_MODEL };
}

/**
 * The config to store after a provider connects, or null to keep the current
 * one. Only a missing config, or one on a model provider that has no key (an
 * Anthropic model without its key), is replaced; a choice on the connected
 * provider, a local server or a custom router is never overwritten.
 * `keyedProviders` lists the providers the server holds a credential for.
 */
export function configAfterConnect(
  id: ModelConnectionId,
  active: ClientModelConfig | null,
  keyedProviders: readonly string[] = [],
): ClientModelConfig | null {
  if (!active) return defaultConfigFor(id);
  if (active.provider === id) return null;
  const needsKey =
    active.provider === "anthropic" ||
    active.provider === "chatgpt" ||
    isOpenRouter(active);
  const hasKey = keyedProviders.includes(active.provider);
  return needsKey && !hasKey ? defaultConfigFor(id) : null;
}

/** Whether the stored config relies on the credential that was just forgotten. */
export function shouldClearConfigOnDisconnect(
  id: string,
  active: ClientModelConfig | null,
): boolean {
  if (!active) return false;
  if (id === "anthropic") return active.provider === "anthropic";
  if (id === "chatgpt") return active.provider === "chatgpt";
  if (id === "router") return isOpenRouter(active);
  return false;
}
