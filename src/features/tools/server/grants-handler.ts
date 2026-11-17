import type { DatabaseSync } from "node:sqlite";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import {
  listAllGrants,
  revokeAllGrants,
  revokeTool,
} from "./grants-repository.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const ID_MAX = 200;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/** GET /api/tools/grants: every always-allow grant, for the Settings list. */
export function handleGetGrants(db: DatabaseSync): Response {
  return json({ grants: listAllGrants(db) });
}

const validId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= ID_MAX;

/**
 * DELETE /api/tools/grants. A body of {botId, toolName} revokes one grant and
 * {all: true} revokes every grant. Grants are read from the store on each
 * tool turn, so the next call of the tool asks again.
 */
export async function handleDeleteGrants(
  request: Request,
  db: DatabaseSync,
): Promise<Response> {
  const text = await readBodyWithCap(
    request,
    bodyLimitFor("DELETE", "/api/tools/grants"),
  );
  if (text === null) return json({ error: "payload_too_large" }, 413);
  let body: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // Falls through to invalid_body.
  }
  if (!body) return json({ error: "invalid_body" }, 400);
  if (body.all === true) {
    revokeAllGrants(db);
  } else if (validId(body.botId) && validId(body.toolName)) {
    revokeTool(db, body.botId, body.toolName);
  } else {
    return json({ error: "invalid_body" }, 400);
  }
  return json({ grants: listAllGrants(db) });
}
