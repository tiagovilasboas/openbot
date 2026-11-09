"use client";

import { useState } from "react";
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
  const [failedFor, setFailedFor] = useState<{
    config: ClientModelConfig | null;
  } | null>(null);

  const status = modelStatus({
    isConfigured,
    config,
    lastCallFailed: failedFor !== null && failedFor.config === config,
  });

  function recordModelCall(result?: ModelCallResult) {
    if (result) setFailedFor(result === "failed" ? { config } : null);
  }

  return { status, recordModelCall };
}
