import { refreshSavedKeys } from "../../key-vault/saved-keys-store.ts";
import {
  clearStoredModelConfig,
  loadStoredModelConfig,
} from "../../model/model-config.ts";
import { disconnectKey } from "../api-key/manage-connection.ts";
import { disconnectConnection, resetConnectFlow } from "../client/index.ts";
import type { ConnectionId } from "../core/index.ts";

/**
 * Forgets a service. Model keys go through the connections route and the saved
 * state is read again, so the rest of the app sees no key.
 */
export async function disconnectService(id: ConnectionId): Promise<void> {
  resetConnectFlow();
  if (id === "github") {
    await disconnectKey(id);
    return;
  }
  await disconnectConnection(id);
  await refreshSavedKeys();
  if (id === "anthropic" && loadStoredModelConfig()?.provider === "anthropic") {
    // An Anthropic model cannot answer without its key.
    clearStoredModelConfig();
  }
}
