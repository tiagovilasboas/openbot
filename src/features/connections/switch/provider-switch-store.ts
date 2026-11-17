"use client";

import { useSyncExternalStore } from "react";
import { notifySettingsChanged } from "../../settings/settings-sync-port.ts";
import type { ConnectionId } from "../core/index.ts";
import { parseOffProviders, withProviderOff } from "./provider-switch.ts";

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

/** The saved list; undefined while this browser never saved one. */
export function loadStoredOffProviders(): ConnectionId[] | undefined {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === null
      ? undefined
      : readOffProviders();
  } catch {
    return undefined;
  }
}

/**
 * Saves the list and queues it for the server, which refuses an off
 * provider. The load passes `sync: false` to mirror the server's list.
 */
export function writeOffProviders(
  next: readonly ConnectionId[],
  options: { sync?: boolean } = {},
): void {
  const raw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cached = [...next];
  emit();
  if (options.sync !== false) notifySettingsChanged({ providersOff: cached });
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

/** A provider that connected is in use again: drops it from the off list. */
export function clearProviderOff(id: ConnectionId): void {
  const off = readOffProviders();
  if (off.includes(id)) writeOffProviders(withProviderOff(off, id, false));
}
