"use client";

import { useSyncExternalStore } from "react";
import {
  loadStoredGitHubToken,
  subscribeGitHubToken,
} from "./github-config.ts";

export function useGitHubToken(): string | null {
  return useSyncExternalStore(
    subscribeGitHubToken,
    loadStoredGitHubToken,
    () => null,
  );
}
