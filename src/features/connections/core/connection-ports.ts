import type { ConnectionId } from "./connection-methods.ts";

/**
 * Ports the Connect flows depend on. Adapters outside core implement them,
 * so a flow never knows where a credential is kept or how it is encrypted.
 */

export interface CredentialStatus {
  connected: boolean;
  /** Epoch milliseconds of the last save, or null when not connected. */
  updatedAt: number | null;
}

/** Keeps the one credential of each connection. Implemented over the key vault. */
export interface CredentialStore {
  save(id: ConnectionId, credential: string): Promise<void>;
  remove(id: ConnectionId): Promise<void>;
  status(id: ConnectionId): Promise<CredentialStatus>;
}

/** What a started OAuth Connect must remember until its callback. */
export interface PendingAuth {
  id: ConnectionId;
  /** PKCE secret: never leaves the server. */
  verifier: string;
  createdAt: number;
}

/**
 * Holds pending OAuth Connects by their one-time state token. `take` returns
 * a pending Connect once and forgets it, so a callback cannot be replayed.
 */
export interface PendingAuthStore {
  put(state: string, pending: PendingAuth): void;
  take(state: string): PendingAuth | null;
}

/** Epoch milliseconds; injected so expiry is testable. */
export type Clock = () => number;
