import type { RouterConfig } from "../model/model-config.ts";
import type { SavedKeys } from "../key-vault/saved-keys-api.ts";
import { OPENROUTER_ORIGIN } from "../key-vault/key-origin.ts";

/** The free route "start free" stores. OpenRouter picks a free model per call. */
export const START_FREE_CONFIG: RouterConfig = {
  provider: "router",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "openrouter/free",
};

export type FirstRunStep =
  /** A model is ready (or the user never asked for the flow): show nothing. */
  | "hidden"
  /** No model yet: offer "start free" or "connect". */
  | "choose"
  /** Started free, still waiting for the server to say if a key is saved. */
  | "checking"
  /** Started free, but OpenRouter has no key saved: say so, offer to connect. */
  | "needs-key";

export interface FirstRunInput {
  isConfigured: boolean;
  /** The user pressed "start free" in this session. */
  startedFree: boolean;
  savedKeys: SavedKeys;
  savedKeysLoaded: boolean;
}

/**
 * OpenRouter rejects every call without a key, free models included, so
 * "start free" only ends in a working chat when a key is already saved.
 */
export function firstRunStep(input: FirstRunInput): FirstRunStep {
  if (!input.isConfigured) return "choose";
  if (!input.startedFree) return "hidden";
  if (!input.savedKeysLoaded) return "checking";
  return input.savedKeys.router?.origin === OPENROUTER_ORIGIN
    ? "hidden"
    : "needs-key";
}
