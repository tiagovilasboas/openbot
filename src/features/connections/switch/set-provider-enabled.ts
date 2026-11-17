import {
  applyModelAfterConnect,
  clearModelAfterDisconnect,
} from "../api-key/manage-connection.ts";
import { readSavedKeysState } from "../../key-vault/saved-keys-store.ts";
import type { ConnectionId } from "../core/index.ts";
import { disconnectService } from "../panel/disconnect-connection.ts";
import { refuseWhileRunning, withProviderOff } from "./provider-switch.ts";
import {
  readOffProviders,
  readRunningTurn,
  writeOffProviders,
} from "./provider-switch-store.ts";

export type ProviderChange =
  { ok: true } | { ok: false; reason: "turnRunning" };

/**
 * Turns a provider off or on. Off keeps the key but drops the chat model that
 * relies on it, so nothing is sent there; on restores a default model when
 * the chat has none. Refused while a running turn uses the provider.
 */
export function setProviderEnabled(
  id: ConnectionId,
  enabled: boolean,
): ProviderChange {
  const reason = refuseWhileRunning(id, readRunningTurn());
  if (reason) return { ok: false, reason };
  writeOffProviders(withProviderOff(readOffProviders(), id, !enabled));
  if (enabled) {
    // Without a saved key there is nothing to start a model on.
    if (id !== "github" && readSavedKeysState().keys[id])
      applyModelAfterConnect(id);
  } else clearModelAfterDisconnect(id);
  return { ok: true };
}

/** Disconnects unless a running turn uses the provider; clears its off flag. */
export async function disconnectProvider(
  id: ConnectionId,
): Promise<ProviderChange> {
  const reason = refuseWhileRunning(id, readRunningTurn());
  if (reason) return { ok: false, reason };
  writeOffProviders(withProviderOff(readOffProviders(), id, false));
  await disconnectService(id);
  return { ok: true };
}
