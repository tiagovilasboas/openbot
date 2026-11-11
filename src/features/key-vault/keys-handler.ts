import type { DatabaseSync } from "node:sqlite";
import {
  deleteProviderKey,
  listProviderKeys,
  saveProviderKey,
} from "./provider-key-repository.ts";
import {
  validateKey,
  validateOrigin,
  validateProvider,
} from "./vault-validation.ts";

// Request handlers for /api/keys. The store and master key are injected so
// they can be tested without a server. Responses never carry a key value.

export type VaultContext = { db: DatabaseSync; masterKey: Buffer };

const MAX_BODY_CHARS = 4096;
const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function failure(error: string, status = 400): Response {
  return json({ error }, status);
}

export function handleListKeys(context: VaultContext): Response {
  return json({ keys: listProviderKeys(context.db) });
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) throw new Error("body too large");
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("body is not an object");
  }
  return parsed as Record<string, unknown>;
}

export async function handlePutKey(
  request: Request,
  context: VaultContext,
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await readBody(request);
  } catch {
    return failure("invalid_body");
  }
  const provider = validateProvider(body.provider);
  if (!provider.ok) return failure(provider.code);
  const origin = validateOrigin(body.origin);
  if (!origin.ok) return failure(origin.code);
  const key = validateKey(body.key);
  if (!key.ok) return failure(key.code);
  const saved = saveProviderKey(context.db, context.masterKey, {
    provider: provider.value,
    origin: origin.value,
    key: key.value,
  });
  return json(saved);
}

export function handleDeleteKey(
  request: Request,
  context: VaultContext,
): Response {
  const provider = validateProvider(
    new URL(request.url).searchParams.get("provider"),
  );
  if (!provider.ok) return failure(provider.code);
  deleteProviderKey(context.db, provider.value);
  return new Response(null, { status: 204, headers: NO_STORE });
}

export function vaultUnavailable(): Response {
  return failure("vault_unavailable", 500);
}
