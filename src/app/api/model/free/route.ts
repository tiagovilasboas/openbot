import { OPENROUTER_ORIGIN } from "../../../../features/key-vault/key-origin.ts";
import { vaultKeyLookup } from "../../../../features/key-vault/vault-key-lookup.ts";
import {
  listAccountFreeModels,
  listPublicFreeModels,
} from "../../../../features/model/list-free-models.ts";

export const dynamic = "force-dynamic";

/** The public free model list. */
export async function GET() {
  return Response.json(await listPublicFreeModels());
}

/**
 * The free models the saved OpenRouter key can use. The body only says to use
 * the saved key (`{ "useSavedKey": true }`); the key never leaves the vault.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    useSavedKey?: unknown;
  } | null;
  const apiKey =
    body?.useSavedKey === true
      ? vaultKeyLookup("router", OPENROUTER_ORIGIN)
      : undefined;
  if (!apiKey) return Response.json(await listPublicFreeModels());
  return Response.json(await listAccountFreeModels(apiKey));
}
