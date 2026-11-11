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
import { keyOriginFor } from "../key-vault/key-origin.ts";
import { deleteSavedKey, putSavedKey } from "../key-vault/saved-keys-api.ts";
import { refreshSavedKeys } from "../key-vault/saved-keys-store.ts";
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

/**
 * Saves the key to the server's vault, for the URL it was tested against.
 * False when the server did not save it. Nothing is kept in the browser.
 */
export async function saveKeyToVault(
  id: "router" | "anthropic",
  key: string,
  active: ClientModelConfig | null,
  put: typeof putSavedKey = putSavedKey,
): Promise<boolean> {
  const trimmed = key.trim();
  const origin = keyOriginFor(testConfigFor(id, trimmed, active));
  return origin ? put({ provider: id, origin, key: trimmed }) : false;
}

/** Connects the service. False when a model key could not be saved. */
export async function connectKey(
  id: ConnectionId,
  key: string,
): Promise<boolean> {
  if (id === "github") {
    saveStoredGitHubToken(key);
    return true;
  }
  const active = loadStoredModelConfig();
  if (!(await saveKeyToVault(id, key, active))) return false;
  const next = configAfterConnect(id, active);
  if (next) saveStoredModelConfig(next);
  await refreshSavedKeys();
  return true;
}

/** A first OpenRouter key with no model set starts on the free router. */
export function configAfterConnect(
  id: "router" | "anthropic",
  active: ClientModelConfig | null,
): ClientModelConfig | null {
  if (!active && id === "router") {
    return {
      provider: "router",
      baseUrl: OPENROUTER_URL,
      model: OPENROUTER_TEST_MODEL,
    };
  }
  return null;
}

/** Forgets the key on the server. */
export async function disconnectKey(id: ConnectionId): Promise<void> {
  if (id === "github") {
    clearStoredGitHubToken();
    return;
  }
  await deleteSavedKey(id);
  await refreshSavedKeys();
  if (id === "anthropic" && loadStoredModelConfig()?.provider === "anthropic") {
    // An Anthropic model cannot answer without its key.
    clearStoredModelConfig();
  }
}
