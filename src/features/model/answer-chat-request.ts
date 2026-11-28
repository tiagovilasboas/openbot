import { withVaultKeys } from "../key-vault/apply-vault-keys.ts";
import {
  resolveVaultOAuthSession,
  vaultKeyLookup,
  type OAuthSessionLookup,
} from "../key-vault/vault-key-lookup.ts";
import { executeWithFailover } from "./failover-runner.ts";
import type { parseChatRequest } from "./parse-chat-request.ts";
import { resolveOAuthAuth } from "./resolve-oauth-auth.ts";
import { selectAdapter } from "./select-adapter.ts";
import type { SendOutcome } from "./send-replay.ts";

export type ChatRequest = Extract<
  ReturnType<typeof parseChatRequest>,
  { ok: true }
>["request"];

/**
 * Runs one non-streaming chat request on the server: fills keys and OAuth
 * tokens from the vault, picks the adapters and fails over to the backup
 * models. Shared by `/api/chat` and the routines scheduler.
 */
export async function answerChatRequest(
  request: ChatRequest,
  options: { oauthLookup?: OAuthSessionLookup } = {},
): Promise<SendOutcome> {
  const oauthLookup = options.oauthLookup ?? resolveVaultOAuthSession;
  const auth = await resolveOAuthAuth({
    config: request.config,
    fallbackConfig: request.fallbackConfig,
    oauthLookup,
  });
  if (!auth.ok) {
    return {
      status: auth.failure.status,
      body: {
        error: auth.failure.error,
        provider: auth.failure.provider,
      },
    };
  }

  const modelRequest = withVaultKeys(request, vaultKeyLookup);
  const adapterOptions = auth.oauthTokens
    ? { oauthTokens: auth.oauthTokens }
    : {};
  const primaryAdapter = selectAdapter(
    process.env,
    modelRequest.config,
    undefined,
    adapterOptions,
  );
  if (!primaryAdapter) {
    return { status: 503, body: { error: "no_provider_configured" } };
  }

  const fallbackAdapter =
    modelRequest.fallbackConfig && !auth.skipFallback
      ? selectAdapter(
          process.env,
          modelRequest.fallbackConfig,
          undefined,
          adapterOptions,
        )
      : null;

  const result = await executeWithFailover({
    request: modelRequest,
    primaryAdapter,
    fallbackAdapter,
    env: process.env,
  });

  if (!result.ok) {
    // detail is a status plus a fixed tag, never upstream free text.
    return {
      status: result.code === "blocked_base_url" ? 400 : 502,
      body: {
        error: result.code,
        provider: result.provider,
        detail: result.detail,
      },
    };
  }
  return {
    status: 200,
    body: {
      provider: result.provider,
      text: result.text,
      ...(result.usage ? { usage: result.usage } : {}),
      ...(result.failover ? { failover: result.failover } : {}),
    },
  };
}
