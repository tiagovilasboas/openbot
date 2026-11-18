import { withVaultKeys } from "../key-vault/apply-vault-keys.ts";
import { vaultKeyLookup } from "../key-vault/vault-key-lookup.ts";
import { executeWithFailover } from "./failover-runner.ts";
import type { parseChatRequest } from "./parse-chat-request.ts";
import { selectAdapter } from "./select-adapter.ts";
import type { SendOutcome } from "./send-replay.ts";

export type ChatRequest = Extract<
  ReturnType<typeof parseChatRequest>,
  { ok: true }
>["request"];

/**
 * Runs one non-streaming chat request on the server: fills keys from the
 * vault, picks the adapters and fails over to the backup models. Shared by
 * `/api/chat` and the routines scheduler, which has no browser behind it.
 */
export async function answerChatRequest(
  request: ChatRequest,
): Promise<SendOutcome> {
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
