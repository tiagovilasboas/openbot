import type {
  Clock,
  ConnectFailure,
  ConnectionId,
  CredentialStore,
  PendingAuthStore,
} from "../core/index.ts";
import { exchangeCode, type HttpClient } from "./openrouter-oauth.ts";

/** How long a started Connect waits for its callback. */
export const PENDING_TTL_MS = 10 * 60 * 1000;

export interface FinishOAuthDeps {
  pending: PendingAuthStore;
  clock: Clock;
  http: HttpClient;
  credentials: CredentialStore;
}

/** What the provider's callback carried back to the app. */
export interface OAuthCallback {
  state: string | null;
  code: string | null;
  /** Set when the user declined on the provider's page. */
  error: string | null;
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
 * mismatch; the key goes straight to the credential store and never back out.
 */
export async function finishOAuthConnect(
  deps: FinishOAuthDeps,
  id: ConnectionId,
  callback: OAuthCallback,
): Promise<FinishOAuthOutcome> {
  const pending = callback.state ? deps.pending.take(callback.state) : null;
  if (!pending || pending.id !== id) return failed("state_mismatch");
  if (deps.clock() - pending.createdAt > PENDING_TTL_MS) {
    return { status: "expired" };
  }
  if (callback.error || !callback.code) return failed("denied");
  const exchanged = await exchangeCode(
    deps.http,
    callback.code,
    pending.verifier,
  );
  if (!exchanged.ok) return failed(exchanged.reason);
  try {
    await deps.credentials.save(id, exchanged.key);
  } catch {
    return failed("unavailable");
  }
  return { status: "connected" };
}
