import { modelNotAllowedResponse } from "../../../features/model/allowed-models.ts";
import { executeWithFailover } from "../../../features/model/failover-runner.ts";
import { readIdempotencyKey } from "../../../features/model/idempotency-key.ts";
import { parseChatRequest } from "../../../features/model/parse-chat-request.ts";
import {
  chatSendReplay,
  fingerprintBody,
  type SendOutcome,
} from "../../../features/model/send-replay.ts";
import { withVaultKeys } from "../../../features/key-vault/apply-vault-keys.ts";
import { vaultKeyLookup } from "../../../features/key-vault/vault-key-lookup.ts";
import { selectAdapter } from "../../../features/model/select-adapter.ts";
import { providerOffResponse } from "../../../features/model/provider-off-guard.ts";
import { savedOffProviders } from "../../../features/settings/server/saved-off-providers.ts";

export const dynamic = "force-dynamic";

type ChatRequest = Extract<
  ReturnType<typeof parseChatRequest>,
  { ok: true }
>["request"];

export async function POST(request: Request) {
  const idempotency = readIdempotencyKey(request.headers);
  if (!idempotency.ok) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseChatRequest(payload);
  if (!parsed.ok) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const notAllowed = modelNotAllowedResponse(
    process.env,
    parsed.request.modelId,
  );
  if (notAllowed) return notAllowed;
  const off = providerOffResponse(parsed.request, savedOffProviders);
  if (off) return off;

  if (!idempotency.key) return toResponse(await answer(parsed.request));

  // A repeated send id replays the stored reply; only successes are kept.
  const replay = await chatSendReplay.run(
    idempotency.key,
    fingerprintBody(payload),
    () => answer(parsed.request),
  );
  if (replay.kind === "conflict") {
    return Response.json({ error: "idempotency_conflict" }, { status: 409 });
  }
  if (replay.kind === "failed") {
    // Same contract as a model failure; no upstream detail to share.
    return Response.json({ error: "unknown", provider: null }, { status: 502 });
  }
  return toResponse(replay.outcome);
}

function toResponse(outcome: SendOutcome) {
  return Response.json(outcome.body, { status: outcome.status });
}

async function answer(request: ChatRequest): Promise<SendOutcome> {
  const modelRequest = withVaultKeys(request, vaultKeyLookup);
  const primaryAdapter = selectAdapter(process.env, modelRequest.config);
  if (!primaryAdapter) {
    return { status: 503, body: { error: "no_provider_configured" } };
  }

  const fallbackAdapter = modelRequest.fallbackConfig
    ? selectAdapter(process.env, modelRequest.fallbackConfig)
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
