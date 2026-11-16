import {
  connectRoute,
  type Clock,
  type ConnectionId,
  type PendingAuthStore,
} from "../core/index.ts";
import { authorizeUrlFor, callbackUrlFor } from "./openrouter-oauth.ts";
import { createPkce, createState, type RandomBytes } from "./pkce.ts";

export interface StartOAuthDeps {
  pending: PendingAuthStore;
  clock: Clock;
  random?: RandomBytes;
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
  // OpenRouter is the only OAuth provider wired; its endpoints are fixed.
  if (id !== "router" || connectRoute(id, origin).connect !== "oauth") {
    return { ok: false, error: "oauth_unavailable" };
  }
  const { verifier, challenge } = await createPkce(deps.random);
  const state = createState(deps.random);
  deps.pending.put(state, { id, verifier, createdAt: deps.clock() });
  const callbackUrl = callbackUrlFor(new URL(origin).origin, id, state);
  return { ok: true, authorizeUrl: authorizeUrlFor(callbackUrl, challenge) };
}
