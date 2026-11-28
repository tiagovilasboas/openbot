import {
  noKeyLookup,
  withVaultKey,
  type KeyLookup,
} from "../key-vault/apply-vault-keys.ts";
import {
  noOAuthSessionLookup,
  type OAuthSessionLookup,
} from "../key-vault/vault-key-lookup.ts";
import { isModelAllowed } from "../model/allowed-models.ts";
import { executeWithFailover } from "../model/failover-runner.ts";
import type { FetchLike } from "../model/model-adapter.ts";
import {
  noOffProviders,
  providerOffResponse,
  type OffProvidersLookup,
} from "../model/provider-off-guard.ts";
import { resolveOAuthAuth } from "../model/resolve-oauth-auth.ts";
import { selectAdapter } from "../model/select-adapter.ts";
import { parseSuggestionReply } from "./parse-suggestion-reply.ts";
import { parseSuggestionRequest } from "./parse-suggestion-request.ts";
import { buildSuggestionRequest } from "./suggestion-prompt.ts";

type Env = Record<string, string | undefined>;

export interface SuggestSkillOptions {
  env: Env;
  fetchImpl?: FetchLike;
  /** Where a config with no key finds its saved one; none by default. */
  keyLookup?: KeyLookup;
  /** Where an OAuth provider resolves its access token; none by default. */
  oauthLookup?: OAuthSessionLookup;
  /** The providers the user switched off; none by default. */
  offProviders?: OffProvidersLookup;
}

/**
 * POST /api/skills/suggest: one non-streaming model call that turns a bot's
 * recent user messages into one skill draft. The messages travel as external
 * data; the reply is parsed defensively and is never trusted as instruction.
 * Errors are `{ error }` bodies: the chat route's model failure codes plus
 * `not_enough_history` (422) and `invalid_suggestion` (502).
 */
export async function handleSuggestSkill(
  request: Request,
  {
    env,
    fetchImpl,
    keyLookup = noKeyLookup,
    oauthLookup = noOAuthSessionLookup,
    offProviders = noOffProviders,
  }: SuggestSkillOptions,
): Promise<Response> {
  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseSuggestionRequest(payload);
  if (!parsed.ok) {
    const status = parsed.error === "not_enough_history" ? 422 : 400;
    return Response.json({ error: parsed.error }, { status });
  }
  const { language, messages, modelId } = parsed.request;
  const off = providerOffResponse(parsed.request, offProviders);
  if (off) return off;
  const auth = await resolveOAuthAuth({
    config: parsed.request.config,
    oauthLookup,
  });
  if (!auth.ok) {
    return Response.json(
      { error: auth.failure.error, provider: auth.failure.provider },
      { status: auth.failure.status },
    );
  }
  const config = parsed.request.config
    ? withVaultKey(parsed.request.config, keyLookup)
    : parsed.request.config;

  if (modelId && !isModelAllowed(env, modelId)) {
    return Response.json({ error: "model_not_allowed" }, { status: 400 });
  }
  const primaryAdapter = selectAdapter(
    env,
    config,
    fetchImpl,
    auth.oauthTokens ? { oauthTokens: auth.oauthTokens } : {},
  );
  if (!primaryAdapter) {
    return Response.json({ error: "no_provider_configured" }, { status: 503 });
  }

  const result = await executeWithFailover({
    request: buildSuggestionRequest(language, messages, { config, modelId }),
    primaryAdapter,
    env,
    fetchImpl,
  });
  if (!result.ok) {
    // detail is a status plus a fixed tag, never upstream free text.
    return Response.json(
      { error: result.code, provider: result.provider, detail: result.detail },
      { status: result.code === "blocked_base_url" ? 400 : 502 },
    );
  }

  const skill = parseSuggestionReply(result.text);
  if (!skill) {
    return Response.json({ error: "invalid_suggestion" }, { status: 502 });
  }
  return Response.json({ skill });
}
