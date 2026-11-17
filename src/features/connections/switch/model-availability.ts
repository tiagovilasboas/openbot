import type { ConnectionId } from "../core/index.ts";

/** The connection a Settings provider type runs on; a local server has none. */
export function connectionForProviderType(
  providerType: string | undefined,
): ConnectionId | null {
  return providerType === "router" || providerType === "anthropic"
    ? providerType
    : null;
}

/**
 * The connection a model id runs on. Ids with a vendor ("google/gemma-..")
 * are routed by OpenRouter, bare "claude-.." ids go to Anthropic; anything
 * else cannot be tied to a connection, so it is never blocked.
 */
export function connectionForModelId(
  modelId: string | undefined,
): ConnectionId | null {
  const id = modelId?.trim() ?? "";
  if (!id) return null;
  if (id.includes("/")) return "router";
  return id.startsWith("claude") ? "anthropic" : null;
}

export type Usability =
  { usable: true } | { usable: false; provider: ConnectionId };

/** The single decision: can this connection be used while these are off? */
export function connectionUsability(
  connection: ConnectionId | null,
  off: readonly ConnectionId[],
): Usability {
  return connection && off.includes(connection)
    ? { usable: false, provider: connection }
    : { usable: true };
}

export function providerTypeUsability(
  providerType: string | undefined,
  off: readonly ConnectionId[],
): Usability {
  return connectionUsability(connectionForProviderType(providerType), off);
}

export function modelUsability(
  modelId: string | undefined,
  off: readonly ConnectionId[],
): Usability {
  return connectionUsability(connectionForModelId(modelId), off);
}

/**
 * What the next message would run on: the bot's own model when it has one,
 * else the global provider type.
 */
export function nextTurnUsability(
  ownModelId: string | undefined,
  providerType: string | undefined,
  off: readonly ConnectionId[],
): Usability {
  return ownModelId?.trim()
    ? modelUsability(ownModelId, off)
    : providerTypeUsability(providerType, off);
}
