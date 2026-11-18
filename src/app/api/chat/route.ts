import { answerChatRequest as answer } from "../../../features/model/answer-chat-request.ts";
import { modelNotAllowedResponse } from "../../../features/model/allowed-models.ts";
import { readIdempotencyKey } from "../../../features/model/idempotency-key.ts";
import { parseChatRequest } from "../../../features/model/parse-chat-request.ts";
import {
  chatSendReplay,
  fingerprintBody,
  type SendOutcome,
} from "../../../features/model/send-replay.ts";
import { providerOffResponse } from "../../../features/model/provider-off-guard.ts";
import { savedOffProviders } from "../../../features/settings/server/saved-off-providers.ts";

export const dynamic = "force-dynamic";

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
