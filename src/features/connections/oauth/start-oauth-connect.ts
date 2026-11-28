import {
  connectRoute,
  type Clock,
  type ConnectionId,
  type OAuthClientIdentityStore,
  type PendingAuthStore,
} from "../core/index.ts";
import { chatgptSiwcOAuthProvider } from "./chatgpt-siwc-oauth.ts";
import type { OAuthProviderSpec } from "./oauth-provider.ts";
import { openRouterOAuthProvider } from "./openrouter-oauth.ts";
import { createPkce, createState, type RandomBytes } from "./pkce.ts";

export const OAUTH_PROVIDERS: Readonly<
  Partial<Record<ConnectionId, OAuthProviderSpec>>
> = {
  router: openRouterOAuthProvider,
  chatgpt: chatgptSiwcOAuthProvider,
};

export interface StartOAuthDeps {
  pending: PendingAuthStore;
  clock: Clock;
  random?: RandomBytes;
  clientIdentities?: OAuthClientIdentityStore;
}

export type StartOAuthResult =
  | { ok: true; authorizeUrl: string }
  | { ok: false; error: "oauth_unavailable" };

/**
 * Begins an OAuth Connect from `origin`: remembers the PKCE verifier under a
 * fresh state and returns the provider page to open. Refused when the Connect
 * route for this origin is not OAuth, since its callback could never finish.
 */
export async function startOAuthConnect(
  deps: StartOAuthDeps,
  id: ConnectionId,
  origin: string,
): Promise<StartOAuthResult> {
  const provider = OAUTH_PROVIDERS[id];
  if (!provider || connectRoute(id, origin).connect !== "oauth") {
    return { ok: false, error: "oauth_unavailable" };
  }
  const { verifier, challenge } = await createPkce(deps.random);
  const state = createState(deps.random);
  const built = provider.buildAuthorizeUrl({
    id,
    origin,
    state,
    challenge,
    random: deps.random,
    clientIdentities: deps.clientIdentities,
  });
  if (!built) {
    return { ok: false, error: "oauth_unavailable" };
  }
  deps.pending.put(state, {
    id,
    verifier,
    redirectUri: built.redirectUri,
    ...(built.nonce ? { nonce: built.nonce } : {}),
    createdAt: deps.clock(),
  });
  return { ok: true, authorizeUrl: built.authorizeUrl };
}
