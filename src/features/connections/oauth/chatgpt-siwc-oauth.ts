import type { ConnectFailure } from "../core/index.ts";
import type { ExchangeResult, OAuthProviderSpec } from "./oauth-provider.ts";
import { createNonce } from "./pkce.ts";

/**
 * OpenAI Sign in with ChatGPT (SIWC) PKCE endpoints and official client flow.
 * Dynamic clients start as `dynamic_agent_client` and persist any issued `oaiapp_*`
 * client_id per host identity on the server.
 */

export const CHATGPT_AUTHORIZE_URL =
  "https://auth.openai.com/api/accounts/authorize";
export const CHATGPT_TOKEN_URL =
  "https://auth.openai.com/api/accounts/oauth/token";
export const CHATGPT_DYNAMIC_CLIENT_ID = "dynamic_agent_client";
export const CHATGPT_AGENT_NAME_HINT = "Open Bot";
export const CHATGPT_SIWC_SCOPE =
  "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
export const CHATGPT_RESOURCE = "https://api.openai.com/v1";

const EXCHANGE_TIMEOUT_MS = 15_000;

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function failureForStatus(status: number): ConnectFailure {
  return status >= 400 && status < 500 ? "invalid_key" : "network";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function extractAccountLabel(
  claims: Record<string, unknown> | null,
): string | null {
  if (!claims) return null;
  const email = nonEmptyString(claims.email);
  if (email) return email;
  const name = nonEmptyString(claims.name);
  if (name) return name;
  const auth = claims["https://api.openai.com/auth"];
  if (typeof auth === "object" && auth !== null && !Array.isArray(auth)) {
    const plan = nonEmptyString(
      (auth as Record<string, unknown>).chatgpt_plan_type,
    );
    if (plan) return plan;
  }
  return null;
}

export function chatgptRedirectUriFor(origin: string, id: string): string {
  const url = new URL("/", origin);
  url.searchParams.set("connect", id);
  return url.toString();
}

function buildSiwcAuthorizeUrl(params: {
  clientId: string;
  hostId: string;
  challenge: string;
  state: string;
  nonce: string;
  redirectUri: string;
}): string {
  const url = new URL(CHATGPT_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("agent_name_hint", CHATGPT_AGENT_NAME_HINT);
  url.searchParams.set("ext_agent_host_id", params.hostId);
  url.searchParams.set("scope", CHATGPT_SIWC_SCOPE);
  url.searchParams.set("resource", CHATGPT_RESOURCE);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export const chatgptSiwcOAuthProvider: OAuthProviderSpec = {
  buildAuthorizeUrl({
    id,
    origin,
    state,
    challenge,
    random,
    clientIdentities,
  }) {
    if (!clientIdentities) return null;
    const hostId = clientIdentities.readOrCreateHostId(id);
    const savedClientId = nonEmptyString(clientIdentities.readClientId(id));
    const clientId = savedClientId ?? CHATGPT_DYNAMIC_CLIENT_ID;
    const nonce = createNonce(random);
    const redirectUri = chatgptRedirectUriFor(new URL(origin).origin, id);
    return {
      authorizeUrl: buildSiwcAuthorizeUrl({
        clientId,
        hostId,
        challenge,
        state,
        nonce,
        redirectUri,
      }),
      redirectUri,
      nonce,
    };
  },

  async exchangeCode({
    id,
    http,
    clock,
    code,
    pending,
    clientId,
    clientIdentities,
  }): Promise<ExchangeResult> {
    const savedClientId = nonEmptyString(clientIdentities?.readClientId(id));
    const callbackClientId = nonEmptyString(clientId);
    const requestClientId =
      callbackClientId ?? savedClientId ?? CHATGPT_DYNAMIC_CLIENT_ID;
    const hostId = clientIdentities?.readOrCreateHostId(id);

    const form = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: pending.redirectUri,
      code_verifier: pending.verifier,
      client_id: requestClientId,
    });

    let response: Response;
    try {
      response = await http(CHATGPT_TOKEN_URL, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        body: form.toString(),
        redirect: "error",
        signal: AbortSignal.timeout(EXCHANGE_TIMEOUT_MS),
      });
    } catch {
      return { ok: false, reason: "network" };
    }

    if (!response.ok) {
      return { ok: false, reason: failureForStatus(response.status) };
    }

    const body: unknown = await response.json().catch(() => null);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { ok: false, reason: "invalid_key" };
    }
    const payload = body as Record<string, unknown>;
    const accessToken = nonEmptyString(payload.access_token);
    if (!accessToken) {
      return { ok: false, reason: "invalid_key" };
    }

    const idToken = nonEmptyString(payload.id_token);
    const idClaims = idToken ? decodeJwtPayload(idToken) : null;
    if (idToken && !idClaims) {
      return { ok: false, reason: "invalid_key" };
    }
    if (idClaims && pending.nonce && idClaims.nonce !== pending.nonce) {
      return { ok: false, reason: "invalid_key" };
    }

    const tokenClientId = nonEmptyString(payload.client_id);
    const issuedClientId =
      (callbackClientId && callbackClientId !== CHATGPT_DYNAMIC_CLIENT_ID
        ? callbackClientId
        : undefined) ??
      (tokenClientId && tokenClientId !== CHATGPT_DYNAMIC_CLIENT_ID
        ? tokenClientId
        : undefined);
    if (issuedClientId && clientIdentities) {
      clientIdentities.saveClientId(id, issuedClientId);
    }

    const finalClientId = issuedClientId ?? savedClientId;
    const refreshToken = nonEmptyString(payload.refresh_token);
    const expiresAt =
      typeof payload.expires_in === "number" &&
      Number.isFinite(payload.expires_in) &&
      payload.expires_in > 0
        ? clock() + Math.floor(payload.expires_in * 1000)
        : null;
    const accountLabel =
      extractAccountLabel(idClaims) ??
      extractAccountLabel(decodeJwtPayload(accessToken));

    return {
      ok: true,
      credential: {
        kind: "oauth-session",
        accessToken,
        ...(refreshToken ? { refreshToken } : {}),
        expiresAt,
        ...(finalClientId ? { clientId: finalClientId } : {}),
        ...(hostId ? { hostId } : {}),
        accountLabel,
      },
    };
  },
};
