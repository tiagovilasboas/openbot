import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from "./guard-types.ts";

/** localStorage key for the optional access token (see OPENBOT_ACCESS_TOKEN). */
export const ACCESS_TOKEN_STORAGE_KEY = "openbot_access_token";

function readAccessToken(): string | null {
  try {
    const token = globalThis.localStorage?.getItem(ACCESS_TOKEN_STORAGE_KEY);
    return token?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * The one place that decorates a fetch to /api/*: it adds the client header
 * and, when the user saved an access token, the Bearer token. Every client
 * call site wraps its RequestInit with this.
 */
export function withApiHeaders(
  init: RequestInit = {},
  readToken: () => string | null = readAccessToken,
): RequestInit {
  const headers = new Headers(init.headers);
  headers.set(CLIENT_HEADER, CLIENT_HEADER_VALUE);
  const token = readToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return { ...init, headers };
}
