import { refreshSavedKeys } from "../../key-vault/saved-keys-store.ts";
import {
  clearModelAfterDisconnect,
  disconnectKey,
} from "../api-key/manage-connection.ts";
import { disconnectConnection, resetConnectFlow } from "../client/index.ts";
import type { ConnectionId } from "../core/index.ts";

/** The server did not confirm the delete: nothing local was changed. */
export type DisconnectResult =
  { ok: true } | { ok: false; reason: "disconnectFailed" };

/**
 * Forgets a service. Model keys go through the connections route; the saved
 * state and the stored model change only after the server confirmed the
 * delete, so a failure leaves everything as it was.
 */
export async function disconnectService(
  id: ConnectionId,
  remove: (id: ConnectionId) => Promise<boolean> = disconnectConnection,
): Promise<DisconnectResult> {
  resetConnectFlow();
  if (id === "github") {
    await disconnectKey(id);
    return { ok: true };
  }
  if (!(await remove(id))) return { ok: false, reason: "disconnectFailed" };
  await refreshSavedKeys();
  clearModelAfterDisconnect(id);
  return { ok: true };
}
