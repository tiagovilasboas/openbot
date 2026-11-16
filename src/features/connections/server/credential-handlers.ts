import {
  isConnectionId,
  type ConnectionId,
  type CredentialStore,
} from "../core/index.ts";
import { keepsCredential } from "../credentials/index.ts";
import { failure, json, noContent } from "./connection-response.ts";

export interface CredentialDeps {
  credentials: CredentialStore;
}

function storedConnection(rawId: string): ConnectionId | null {
  return isConnectionId(rawId) && keepsCredential(rawId) ? rawId : null;
}

function unavailable(error: unknown): Response {
  // The message names the fault (such as a bad vault setting), never a value.
  console.error(
    "connections: credential store unavailable:",
    (error as Error).message,
  );
  return failure("unavailable", 500);
}

/** GET /api/connections/[id]: whether a credential is saved, never its value. */
export async function handleStatus(
  rawId: string,
  deps: CredentialDeps,
): Promise<Response> {
  const id = storedConnection(rawId);
  if (!id) return failure("unknown_connection", 404);
  try {
    return json({ id, ...(await deps.credentials.status(id)) });
  } catch (error) {
    return unavailable(error);
  }
}

/** DELETE /api/connections/[id]: forgets the credential. Safe to repeat. */
export async function handleDisconnect(
  rawId: string,
  deps: CredentialDeps,
): Promise<Response> {
  const id = storedConnection(rawId);
  if (!id) return failure("unknown_connection", 404);
  try {
    await deps.credentials.remove(id);
    return noContent();
  } catch (error) {
    return unavailable(error);
  }
}
