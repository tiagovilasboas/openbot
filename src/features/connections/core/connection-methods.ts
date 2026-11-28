/**
 * Which services Open Bot connects to, and the ways each one can connect.
 * Pure domain: no framework, storage or network.
 */

/** The services Open Bot connects to. */
export type ConnectionId = "router" | "anthropic" | "chatgpt" | "github";

/**
 * How a connection is made.
 * - `oauth`: the provider's own sign-in page hands back a credential (PKCE).
 * - `api-key`: the user pastes a key or token they created.
 */
export type ConnectMethod = "oauth" | "api-key";

export interface ConnectionMethods {
  /** What the Connect button does when the place can run it. */
  preferred: ConnectMethod;
  /** The other way in, or null when the service has only one. */
  alternative: ConnectMethod | null;
}

const METHODS: Readonly<Record<ConnectionId, ConnectionMethods>> = {
  // OpenRouter publishes OAuth PKCE for third-party apps.
  router: { preferred: "oauth", alternative: "api-key" },
  // Anthropic allows API keys only for third-party apps; no Claude.ai sign-in.
  anthropic: { preferred: "api-key", alternative: null },
  // OpenAI ChatGPT uses Sign in with ChatGPT (OAuth PKCE) only.
  chatgpt: { preferred: "oauth", alternative: null },
  github: { preferred: "api-key", alternative: null },
};

export const CONNECTION_IDS = Object.keys(METHODS) as readonly ConnectionId[];

export function isConnectionId(value: unknown): value is ConnectionId {
  return typeof value === "string" && Object.hasOwn(METHODS, value);
}

export function connectionMethods(id: ConnectionId): ConnectionMethods {
  return METHODS[id];
}
