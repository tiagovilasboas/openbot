import {
  listAccountFreeModels,
  listPublicFreeModels,
} from "../../../../features/model/list-free-models.ts";

export const dynamic = "force-dynamic";

/** The public free model list. */
export async function GET() {
  return Response.json(await listPublicFreeModels());
}

/** The free models one OpenRouter key can use; the key stays on the server. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    apiKey?: unknown;
  } | null;
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) return Response.json(await listPublicFreeModels());
  return Response.json(await listAccountFreeModels(apiKey));
}
