/**
 * Request reading and response shapes of the /api/connections handlers.
 * Responses are never cached and never carry a credential.
 */

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_CHARS = 4096;
const MAX_FIELD_CHARS = 2048;

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function failure(error: string, status: number): Response {
  return json({ error }, status);
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}

/** The JSON object in the body, or null when it is missing, too big or not an object. */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY_CHARS) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** A non-empty string field of a bounded size, or null. */
export function stringField(
  body: Record<string, unknown>,
  name: string,
): string | null {
  const value = body[name];
  return typeof value === "string" && value && value.length <= MAX_FIELD_CHARS
    ? value
    : null;
}

/**
 * The origin the browser is on. The request guard already pinned the Origin
 * header to this host, so it wins; without it the request URL tells.
 */
export function requestOrigin(request: Request): string {
  return request.headers.get("origin") ?? new URL(request.url).origin;
}
