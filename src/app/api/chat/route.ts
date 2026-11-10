import { modelNotAllowedResponse } from "../../../features/model/allowed-models.ts";
import { executeWithFailover } from "../../../features/model/failover-runner.ts";
import { parseChatRequest } from "../../../features/model/parse-chat-request.ts";
import { selectAdapter } from "../../../features/model/select-adapter.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  const primaryAdapter = selectAdapter(process.env, parsed.request.config);
  if (!primaryAdapter) {
    return Response.json({ error: "no_provider_configured" }, { status: 503 });
  }

  const fallbackAdapter = parsed.request.fallbackConfig
    ? selectAdapter(process.env, parsed.request.fallbackConfig)
    : null;

  const result = await executeWithFailover({
    request: parsed.request,
    primaryAdapter,
    fallbackAdapter,
    env: process.env,
  });

  if (!result.ok) {
    // detail is a status plus a fixed tag, never upstream free text.
    return Response.json(
      { error: result.code, provider: result.provider, detail: result.detail },
      { status: result.code === "blocked_base_url" ? 400 : 502 },
    );
  }
  return Response.json({
    provider: result.provider,
    text: result.text,
    ...(result.usage ? { usage: result.usage } : {}),
    ...(result.failover ? { failover: result.failover } : {}),
  });
}
