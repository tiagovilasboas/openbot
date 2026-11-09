"use client";

import { useSyncExternalStore } from "react";
import {
  readProviderKeysSnapshot,
  subscribeProviderKeys,
  type ProviderKeys,
} from "./provider-keys.ts";

const noKeys: ProviderKeys = {};

export function useProviderKeys(): ProviderKeys {
  return useSyncExternalStore(
    subscribeProviderKeys,
    readProviderKeysSnapshot,
    () => noKeys,
  );
}
