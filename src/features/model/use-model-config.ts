"use client";

import { useSyncExternalStore } from "react";
import {
  loadStoredModelConfig,
  subscribeModelConfig,
  type ClientModelConfig,
} from "./model-config";

export function useModelConfig(): ClientModelConfig | null {
  return useSyncExternalStore(
    subscribeModelConfig,
    loadStoredModelConfig,
    () => null,
  );
}
