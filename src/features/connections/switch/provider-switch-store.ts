"use client";

import { useSyncExternalStore } from "react";
import type { ConnectionId } from "../core/index.ts";
import { parseOffProviders } from "./provider-switch.ts";

const STORAGE_KEY = "openbot_providers_off";

let listeners: Array<() => void> = [];
let cachedRaw: string | null = null;
let cached: ConnectionId[] = [];
let runningProvider: ConnectionId | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
    window.removeEventListener("storage", listener);
  };
}

/** The providers turned off. Their keys stay saved; only the use stops. */
export function readOffProviders(): ConnectionId[] {
  if (typeof window === "undefined") return cached;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseOffProviders(raw);
  }
  return cached;
}

export function writeOffProviders(next: readonly ConnectionId[]): void {
  const raw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cached = [...next];
  emit();
}

export function useOffProviders(): readonly ConnectionId[] {
  return useSyncExternalStore(subscribe, readOffProviders, () => cached);
}

/** Chat reports which provider a running turn uses; null when none runs. */
export function reportRunningTurn(provider: ConnectionId | null): void {
  runningProvider = provider;
  emit();
}

export function readRunningTurn(): ConnectionId | null {
  return runningProvider;
}

export function useRunningTurn(): ConnectionId | null {
  return useSyncExternalStore(subscribe, readRunningTurn, () => null);
}
