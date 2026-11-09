import {
  clearStoredGitHubToken,
  saveStoredGitHubToken,
} from "../github/github-config.ts";
import { testGitHubToken } from "../github/test-github-token.ts";
import {
  clearStoredModelConfig,
  loadStoredModelConfig,
  saveStoredModelConfig,
  type ClientModelConfig,
} from "../model/model-config.ts";
import { saveProviderKey } from "../model/provider-keys.ts";
import { testModelConnection } from "../model/test-model-connection.ts";
import type { ConnectionId } from "./connection-catalog.ts";

export type KeyCheckOutcome =
  { ok: true; user?: string } | { ok: false; error: string; detail?: string };

const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_TEST_MODEL = "openrouter/free";
const ANTHROPIC_TEST_MODEL = "claude-haiku-5-5";

/** The config used to try a model key: the active one when it matches. */
export function testConfigFor(
  id: "router" | "anthropic",
  key: string,
  active: ClientModelConfig | null,
): ClientModelConfig {
  if (id === "router") {
    const usesOpenRouter =
      active?.provider === "router" && active.baseUrl.includes("openrouter.ai");
    return {
      provider: "router",
      baseUrl: usesOpenRouter ? active.baseUrl : OPENROUTER_URL,
      model: usesOpenRouter ? active.model : OPENROUTER_TEST_MODEL,
      apiKey: key,
    };
  }
  return {
    provider: "anthropic",
    apiKey: key,
    model:
      active?.provider === "anthropic" ? active.model : ANTHROPIC_TEST_MODEL,
  };
}

/** Asks the service whether it accepts the key, before anything is saved. */
export async function checkConnectionKey(
  id: ConnectionId,
  key: string,
): Promise<KeyCheckOutcome> {
  if (id === "github") {
    const outcome = await testGitHubToken(key);
    if (!outcome.ok) return { ok: false, error: outcome.error };
    return outcome.authenticated
      ? { ok: true, ...(outcome.user ? { user: outcome.user } : {}) }
      : { ok: false, error: "unauthorized" };
  }
  const outcome = await testModelConnection(
    testConfigFor(id, key.trim(), loadStoredModelConfig()),
  );
  return outcome.ok
    ? { ok: true }
    : {
        ok: false,
        error: outcome.error,
        ...(outcome.detail ? { detail: outcome.detail } : {}),
      };
}

/** Saves the key, and hands it to the active model when it uses this one. */
export function connectKey(id: ConnectionId, key: string): void {
  if (id === "github") {
    saveStoredGitHubToken(key);
    return;
  }
  saveProviderKey(id, key);
  const active = loadStoredModelConfig();
  if (active?.provider === id) {
    saveStoredModelConfig({ ...active, apiKey: key.trim() });
  }
}

/** Forgets the key, including the copy the active model holds. */
export function disconnectKey(id: ConnectionId): void {
  if (id === "github") {
    clearStoredGitHubToken();
    return;
  }
  saveProviderKey(id, "");
  const active = loadStoredModelConfig();
  if (active?.provider === "router" && id === "router") {
    saveStoredModelConfig({
      provider: "router",
      baseUrl: active.baseUrl,
      model: active.model,
    });
  } else if (active?.provider === "anthropic" && id === "anthropic") {
    // An Anthropic config cannot exist without its key.
    clearStoredModelConfig();
  }
}
