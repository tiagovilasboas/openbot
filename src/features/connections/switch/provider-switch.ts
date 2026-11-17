import type { ConnectionId } from "../core/index.ts";

/** What a provider row says: AC-ST-1. Off wins over everything else. */
export type ProviderState = "notConfigured" | "connected" | "inUse" | "off";

export function describeProviderState({
  isSaved,
  isInUse,
  isOff,
}: {
  isSaved: boolean;
  isInUse: boolean;
  isOff: boolean;
}): ProviderState {
  if (isOff) return "off";
  if (isInUse) return "inUse";
  return isSaved ? "connected" : "notConfigured";
}

const KNOWN: readonly ConnectionId[] = ["router", "anthropic", "github"];

/** The providers turned off, read from storage; anything unknown is dropped. */
export function parseOffProviders(raw: string | null): ConnectionId[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return KNOWN.filter((id) => parsed.includes(id));
  } catch {
    return [];
  }
}

/** The off list after turning one provider off or on again. */
export function withProviderOff(
  off: readonly ConnectionId[],
  id: ConnectionId,
  isOff: boolean,
): ConnectionId[] {
  const rest = off.filter((item) => item !== id);
  return isOff ? [...rest, id] : rest;
}

/** Why a disconnect or a switch-off is refused: a turn is using the provider. */
export function refuseWhileRunning(
  id: ConnectionId,
  runningProvider: ConnectionId | null,
): "turnRunning" | null {
  return runningProvider === id ? "turnRunning" : null;
}
