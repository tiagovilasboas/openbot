import { isConnectionId, type ConnectionId } from "../core/index.ts";

/** What the provider's redirect left in the URL: ids and codes, never a key. */
export interface ConnectReturn {
  id: ConnectionId;
  state: string;
  code?: string;
  error?: string;
  clientId?: string;
}

const PARAMS = ["connect", "state", "code", "error", "client_id"] as const;

/** The Connect return carried by a query string, or null when there is none. */
export function parseConnectReturn(search: string): ConnectReturn | null {
  const params = new URLSearchParams(search);
  const id = params.get("connect");
  if (!id || !isConnectionId(id)) return null;
  const code = params.get("code");
  const error = params.get("error");
  const clientId = params.get("client_id");
  return {
    id,
    state: params.get("state") ?? "",
    ...(code ? { code } : {}),
    ...(error ? { error } : {}),
    ...(clientId ? { clientId } : {}),
  };
}

/** The same location without the Connect params, so a reload cannot replay them. */
export function withoutConnectParams(
  pathname: string,
  search: string,
  hash: string,
): string {
  const params = new URLSearchParams(search);
  for (const name of PARAMS) params.delete(name);
  const rest = params.toString();
  return `${pathname}${rest ? `?${rest}` : ""}${hash}`;
}
