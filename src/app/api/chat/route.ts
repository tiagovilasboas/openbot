import { parseChatRequest } from "@/features/model/parse-chat-request";
import { selectAdapter } from "@/features/model/select-adapter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseChatRequest(payload);
  if (!parsed.ok) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const adapter = selectAdapter(process.env, parsed.request.config);
  if (!adapter) {
    return Response.json({ error: "no_provider_configured" }, { status: 503 });
  }

  const result = await adapter.generateReply(parsed.request);
  if (!result.ok) {
    return Response.json(
      { error: result.code, provider: result.provider },
      { status: 502 },
    );
  }
  return Response.json({ provider: result.provider, text: result.text });
}
