import { validateClientModelConfig } from "@/features/model/model-config";
import { selectAdapter } from "@/features/model/select-adapter";

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

  const adapter = selectAdapter(process.env, customConfig);
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
      { ok: false, error: result.code, provider: result.provider },
      { status: 502 },
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
