import { getVaultContext } from "../../key-vault/vault-context.ts";
import {
  createMemoryPendingAuthStore,
  createVaultClientIdentityStore,
  createVaultCredentialStore,
} from "../credentials/index.ts";
import {
  PENDING_TTL_MS,
  type FinishOAuthDeps,
  type HttpClient,
  type StartOAuthDeps,
} from "../oauth/index.ts";

/** Everything the connections handlers need, wired once per server process. */
export type ConnectionsDeps = FinishOAuthDeps & StartOAuthDeps;

const EXCHANGE_TIMEOUT_MS = 15_000;
const DEPS_KEY = Symbol.for("openbot.connectionsDeps");
type Holder = { [DEPS_KEY]?: ConnectionsDeps };

// The code exchange goes to a fixed provider URL; a redirect is refused.
const timedFetch: HttpClient = (url, init) =>
  fetch(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(EXCHANGE_TIMEOUT_MS),
  });

/**
 * Composition root. Process-wide, because each route is its own module and a
 * callback must find the pending Connect its start route stored.
 */
export function getConnectionsDeps(): ConnectionsDeps {
  const holder = globalThis as Holder;
  if (!holder[DEPS_KEY]) {
    const clock = Date.now;
    holder[DEPS_KEY] = {
      clock,
      // Kept past the TTL so a late callback reads as expired, not unknown.
      pending: createMemoryPendingAuthStore(clock, PENDING_TTL_MS * 2),
      http: timedFetch,
      credentials: createVaultCredentialStore(getVaultContext),
      clientIdentities: createVaultClientIdentityStore(getVaultContext),
    };
  }
  return holder[DEPS_KEY];
}
