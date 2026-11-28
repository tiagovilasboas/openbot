import { CHATGPT_ORIGIN } from "../key-vault/key-origin.ts";
import type { OAuthRefreshFailureReason } from "../key-vault/oauth-refresh.ts";
import type { OAuthSessionLookup } from "../key-vault/vault-key-lookup.ts";
import type { ClientModelConfig } from "./model-config.ts";

export type OAuthFailureResponse = {
  status: number;
  error:
    | "reauth_required"
    | "missing_session"
    | "provider_unreachable"
    | "vault_unavailable"
    | "invalid_config";
  provider: "chatgpt";
};

export type ResolvedOAuthAuth =
  | {
      ok: true;
      oauthTokens?: Readonly<Record<string, string>>;
      skipFallback: boolean;
    }
  | { ok: false; failure: OAuthFailureResponse };

function oauthFailureFor(
  reason: OAuthRefreshFailureReason,
): OAuthFailureResponse {
  switch (reason) {
    case "reauth_required":
      return { status: 401, error: "reauth_required", provider: "chatgpt" };
    case "missing_session":
      return { status: 401, error: "missing_session", provider: "chatgpt" };
    case "refresh_failed":
      return {
        status: 502,
        error: "provider_unreachable",
        provider: "chatgpt",
      };
    case "vault_unavailable":
      return { status: 500, error: "vault_unavailable", provider: "chatgpt" };
    case "unsupported_provider":
      return { status: 400, error: "invalid_config", provider: "chatgpt" };
  }
}

/**
 * Resolves OAuth access tokens needed by the request before any adapter call
 * or stream slot acquisition. Fails closed when the primary provider needs
 * reauth or has no session, without exposing secrets or upstream payloads.
 */
export async function resolveOAuthAuth({
  config,
  fallbackConfig,
  oauthLookup,
}: {
  config?: ClientModelConfig | null;
  fallbackConfig?: ClientModelConfig | null;
  oauthLookup: OAuthSessionLookup;
}): Promise<ResolvedOAuthAuth> {
  if (config?.provider === "chatgpt") {
    const resolved = await oauthLookup("chatgpt", CHATGPT_ORIGIN);
    if (!resolved.ok) {
      return { ok: false, failure: oauthFailureFor(resolved.reason) };
    }
    return {
      ok: true,
      oauthTokens: { chatgpt: resolved.accessToken },
      skipFallback: false,
    };
  }

  if (fallbackConfig?.provider === "chatgpt") {
    const resolved = await oauthLookup("chatgpt", CHATGPT_ORIGIN);
    if (!resolved.ok) {
      return { ok: true, skipFallback: true };
    }
    return {
      ok: true,
      oauthTokens: { chatgpt: resolved.accessToken },
      skipFallback: false,
    };
  }

  return { ok: true, skipFallback: false };
}
