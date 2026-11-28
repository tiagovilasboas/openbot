import type {
  Clock,
  ConnectFailure,
  ConnectionId,
  CredentialStore,
  OAuthClientIdentityStore,
  PendingAuthStore,
} from "../core/index.ts";
import type { HttpClient } from "./oauth-provider.ts";
import { OAUTH_PROVIDERS } from "./start-oauth-connect.ts";

/** How long a started Connect waits for its callback. */
export const PENDING_TTL_MS = 10 * 60 * 1000;

export interface FinishOAuthDeps {
  pending: PendingAuthStore;
  clock: Clock;
  http: HttpClient;
  credentials: CredentialStore;
  clientIdentities?: OAuthClientIdentityStore;
}

/** What the provider's callback carried back to the app. */
export interface OAuthCallback {
  state: string | null;
  code: string | null;
  /** Set when the user declined on the provider's page. */
  error: string | null;
  /** Dynamic client_id emitted on callback (e.g. SIWC oaiapp_...). */
  clientId?: string | null;
}

export type FinishOAuthOutcome =
  | { status: "connected" }
  | { status: "expired" }
  | { status: "failed"; reason: ConnectFailure };

function failed(reason: ConnectFailure): FinishOAuthOutcome {
  return { status: "failed", reason };
}

/**
 * Ends an OAuth Connect. The state is taken once, so a replayed callback is a
 * mismatch; the credential goes straight to the store and never back out.
 */
export async function finishOAuthConnect(
  deps: FinishOAuthDeps,
  id: ConnectionId,
  callback: OAuthCallback,
): Promise<FinishOAuthOutcome> {
  const provider = OAUTH_PROVIDERS[id];
  const pending = callback.state ? deps.pending.take(callback.state) : null;
  if (!provider || !pending || pending.id !== id) {
    return failed("state_mismatch");
  }
  if (deps.clock() - pending.createdAt > PENDING_TTL_MS) {
    return { status: "expired" };
  }
  if (callback.error || !callback.code) return failed("denied");
  const exchanged = await provider.exchangeCode({
    id,
    http: deps.http,
    clock: deps.clock,
    code: callback.code,
    pending,
    clientId: callback.clientId,
    clientIdentities: deps.clientIdentities,
  });
  if (!exchanged.ok) return failed(exchanged.reason);
  try {
    await deps.credentials.save(id, exchanged.credential);
  } catch {
    return failed("unavailable");
  }
  return { status: "connected" };
}
