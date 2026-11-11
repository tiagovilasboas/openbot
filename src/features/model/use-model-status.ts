"use client";

import { useState } from "react";
import { keyOriginFor } from "../key-vault/key-origin.ts";
import { hasSavedKeyFor } from "../key-vault/saved-keys-api.ts";
import { useSavedKeys } from "../key-vault/use-saved-keys.ts";
import type { ClientModelConfig } from "./model-config.ts";
import {
  modelStatus,
  type ModelCallResult,
  type ModelStatus,
} from "./model-status.ts";

/**
 * The header dot's state. A failed call marks the config in use as failing
 * until a call succeeds or a new config is saved (a pasted key, another model).
 */
export function useModelStatus(
  config: ClientModelConfig | null,
  isConfigured: boolean,
): {
  status: ModelStatus;
  recordModelCall: (result?: ModelCallResult) => void;
} {
  const saved = useSavedKeys();
  const [failedFor, setFailedFor] = useState<{
    config: ClientModelConfig | null;
  } | null>(null);

  // Until the server has answered, a key is assumed rather than flagged missing.
  const hasSavedKey =
    !saved.loaded ||
    (config !== null &&
      config.provider === "router" &&
      hasSavedKeyFor(saved.keys, "router", keyOriginFor(config)));

  const status = modelStatus({
    isConfigured,
    config,
    lastCallFailed: failedFor !== null && failedFor.config === config,
    hasSavedKey,
  });

  function recordModelCall(result?: ModelCallResult) {
    if (result) setFailedFor(result === "failed" ? { config } : null);
  }

  return { status, recordModelCall };
}
