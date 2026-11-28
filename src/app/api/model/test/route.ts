import { withVaultKey } from "../../../../features/key-vault/apply-vault-keys.ts";
import {
  resolveVaultOAuthSession,
  vaultKeyLookup,
} from "../../../../features/key-vault/vault-key-lookup.ts";
import { TEST_TIMEOUT_MS } from "../../../../features/model/guarded-model-fetch.ts";
import { validateClientModelConfig } from "../../../../features/model/model-config.ts";
import { resolveOAuthAuth } from "../../../../features/model/resolve-oauth-auth.ts";
import { selectAdapter } from "../../../../features/model/select-adapter.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const body = (payload ?? {}) as { config?: unknown };
  const customConfig = body.config
    ? validateClientModelConfig(body.config)
    : null;
  if (body.config && !customConfig) {
    return Response.json(
      { ok: false, error: "invalid_config" },
      { status: 400 },
    );
  }

  // A key typed for a test travels in the body; a saved one comes from the vault.
  const keyed = customConfig && withVaultKey(customConfig, vaultKeyLookup);
  const auth = await resolveOAuthAuth({
    config: keyed,
    oauthLookup: resolveVaultOAuthSession,
  });
  if (!auth.ok) {
    return Response.json(
      { ok: false, error: auth.failure.error, provider: auth.failure.provider },
      { status: auth.failure.status },
    );
  }
  const adapter = selectAdapter(process.env, keyed, undefined, {
    timeoutMs: TEST_TIMEOUT_MS,
    ...(auth.oauthTokens ? { oauthTokens: auth.oauthTokens } : {}),
  });
  if (!adapter) {
    return Response.json(
      { ok: false, error: "no_provider_configured" },
      { status: 400 },
    );
  }

  const result = await adapter.generateReply({
    language: "en",
    messages: [{ role: "user", text: "Ping" }],
  });

  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        error: result.code,
        provider: result.provider,
        ...(result.detail ? { detail: result.detail } : {}),
      },
      { status: result.code === "blocked_base_url" ? 400 : 502 },
    );
  }

  return Response.json({
    ok: true,
    provider: result.provider,
    model: adapter.model,
  });
}

export async function GET() {
  const adapter = selectAdapter(process.env);
  if (!adapter) {
    return Response.json({ configured: false });
  }
  return Response.json({
    configured: true,
    provider: adapter.provider,
    model: adapter.model,
  });
}
