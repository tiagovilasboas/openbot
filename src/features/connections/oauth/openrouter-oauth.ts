import type { ConnectFailure } from "../core/index.ts";
import type {
  ExchangeResult,
  HttpClient,
  OAuthProviderSpec,
} from "./oauth-provider.ts";

/**
 * OpenRouter's PKCE endpoints: where the user signs in, and where the code
 * becomes a key. The key goes back to the caller and is never kept here.
 */

export const OPENROUTER_AUTH_URL = "https://openrouter.ai/auth";
export const OPENROUTER_KEYS_URL = "https://openrouter.ai/api/v1/auth/keys";

/** Where the provider sends the browser back: the app, with the Connect's state. */
export function callbackUrlFor(
  origin: string,
  id: string,
  state: string,
): string {
  const url = new URL("/", origin);
  url.searchParams.set("connect", id);
  url.searchParams.set("state", state);
  return url.toString();
}

export function authorizeUrlFor(
  callbackUrl: string,
  challenge: string,
): string {
  const url = new URL(OPENROUTER_AUTH_URL);
  url.searchParams.set("callback_url", callbackUrl);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

// A 4xx means the provider refused this code; anything else is a transport fault.
function failureForStatus(status: number): ConnectFailure {
  return status >= 400 && status < 500 ? "invalid_key" : "network";
}

async function readKey(response: Response): Promise<string | null> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null) return null;
  const key = (body as { key?: unknown }).key;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

/** Trades a callback code for a key. A refused code reads as `invalid_key`. */
export async function exchangeCode(
  http: HttpClient,
  code: string,
  verifier: string,
): Promise<ExchangeResult> {
  let response: Response;
  try {
    response = await http(OPENROUTER_KEYS_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        code_verifier: verifier,
        code_challenge_method: "S256",
      }),
    });
  } catch {
    return { ok: false, reason: "network" };
  }
  if (!response.ok) {
    return { ok: false, reason: failureForStatus(response.status) };
  }
  const key = await readKey(response);
  return key
    ? { ok: true, credential: { kind: "api-key", secret: key } }
    : { ok: false, reason: "invalid_key" };
}

export const openRouterOAuthProvider: OAuthProviderSpec = {
  buildAuthorizeUrl({ id, origin, state, challenge }) {
    const redirectUri = callbackUrlFor(new URL(origin).origin, id, state);
    return {
      authorizeUrl: authorizeUrlFor(redirectUri, challenge),
      redirectUri,
    };
  },
  exchangeCode({ http, code, pending }) {
    return exchangeCode(http, code, pending.verifier);
  },
};
