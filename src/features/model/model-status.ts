import type { ClientModelConfig } from "./model-config.ts";
import { lacksRequiredRouterKey } from "./router-key.ts";

/** What the header dot says about the model: none, answering, or failing. */
export type ModelStatus = "unconfigured" | "ready" | "failing";

/** How the last chat turn that reached the model ended. */
export type ModelCallResult = "ok" | "failed";

export function modelStatus({
  isConfigured,
  config,
  lastCallFailed,
  hasSavedKey,
}: {
  isConfigured: boolean;
  config: ClientModelConfig | null;
  lastCallFailed: boolean;
  /** A key is saved on the server for this config's provider and URL. */
  hasSavedKey: boolean;
}): ModelStatus {
  if (!isConfigured) return "unconfigured";
  if (lastCallFailed) return "failing";
  // Known to fail before any call: OpenRouter without a key.
  if (
    config?.provider === "router" &&
    lacksRequiredRouterKey(
      config.baseUrl,
      hasSavedKey ? "saved" : config.apiKey,
    )
  ) {
    return "failing";
  }
  return "ready";
}
