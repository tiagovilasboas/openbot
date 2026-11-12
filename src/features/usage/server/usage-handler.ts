import type { DatabaseSync } from "node:sqlite";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import { clearUsage, readUsage, replaceUsage } from "./usage-repository.ts";

/** Most records a PUT may carry: 100 bots times 90 days, with room to spare. */
export const USAGE_RECORDS_MAX = 20_000;

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/** GET /api/usage: the whole log and when it was last replaced. */
export function handleGetUsage(db: DatabaseSync): Response {
  return json(readUsage(db));
}

/**
 * PUT /api/usage: replaces the whole log atomically. Last write wins: two
 * tabs saving their own copy overwrite each other, and the next load of the
 * loser follows the server.
 */
export async function handlePutUsage(
  request: Request,
  db: DatabaseSync,
): Promise<Response> {
  const text = await readBodyWithCap(
    request,
    bodyLimitFor("PUT", "/api/usage"),
  );
  if (text === null) return json({ error: "payload_too_large" }, 413);
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Falls through to invalid_body.
  }
  const records =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).records
      : undefined;
  if (!Array.isArray(records)) return json({ error: "invalid_body" }, 400);
  if (records.length > USAGE_RECORDS_MAX) {
    return json({ error: "too_many_records" }, 400);
  }
  return json(replaceUsage(db, records));
}

/** DELETE /api/usage: clears the log; idempotent. */
export function handleDeleteUsage(db: DatabaseSync): Response {
  clearUsage(db);
  return new Response(null, { status: 204, headers: NO_STORE });
}
