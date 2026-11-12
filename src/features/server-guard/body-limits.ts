/** Default cap for a request body. */
export const DEFAULT_BODY_MAX_BYTES = 64 * 1024;

/** A whole bots list (with skills) is far bigger than a chat message. */
export const BOTS_BODY_MAX_BYTES = 2 * 1024 * 1024;

// Route-specific caps, keyed by "METHOD /path". Anything absent uses the default.
const ROUTE_BODY_LIMITS: Readonly<Record<string, number>> = {
  "PUT /api/bots": BOTS_BODY_MAX_BYTES,
  "PUT /api/conversations": 8 * 1024 * 1024,
  "PUT /api/settings": 16 * 1024,
};

/** The body cap for a request; the default when the route has no entry. */
export function bodyLimitFor(method: string, path?: string): number {
  if (!path) return DEFAULT_BODY_MAX_BYTES;
  const key = `${method.toUpperCase()} ${path.replace(/\/+$/, "") || "/"}`;
  return Object.hasOwn(ROUTE_BODY_LIMITS, key)
    ? ROUTE_BODY_LIMITS[key]!
    : DEFAULT_BODY_MAX_BYTES;
}

/**
 * Reads a request body as text, refusing more than maxBytes whatever the
 * headers claim (a missing Content-Length cannot bypass it). Null when over.
 */
export async function readBodyWithCap(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
