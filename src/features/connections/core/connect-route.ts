import {
  connectionMethods,
  type ConnectionId,
  type ConnectMethod,
} from "./connection-methods.ts";

/** What a service's Connect does from this place, and what its menu offers instead. */
export interface ConnectRoute {
  /** Null when no way in can finish from this origin. */
  connect: ConnectMethod | null;
  alternative: ConnectMethod | null;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Whether a provider's sign-in page can send the browser back to this origin:
 * dynamic SIWC (`chatgpt`) accepts loopback origins only; other OAuth
 * providers accept https anywhere or plain http on a loopback host.
 */
export function canTakeCallback(origin: string, id?: ConnectionId): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const isLoopback = LOOPBACK_HOSTS.has(url.hostname);
  if (id === "chatgpt") {
    return (
      (url.protocol === "http:" || url.protocol === "https:") && isLoopback
    );
  }
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && isLoopback;
}

/**
 * The one decision every surface makes for a service row. Connect takes the
 * preferred way when this origin can run it; otherwise the alternative moves
 * up, so the row never shows a button that cannot finish.
 */
export function connectRoute(id: ConnectionId, origin: string): ConnectRoute {
  const { preferred, alternative } = connectionMethods(id);
  if (preferred !== "oauth" || canTakeCallback(origin, id)) {
    return { connect: preferred, alternative };
  }
  return { connect: alternative, alternative: null };
}
