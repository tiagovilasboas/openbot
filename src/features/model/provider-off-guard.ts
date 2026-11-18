import {
  connectionForProviderType,
  connectionUsability,
  type ConnectionId,
} from "../connections/copy.ts";
import type { ModelRequest } from "./model-adapter.ts";

/** Where a model route finds the providers the user switched off. */
export type OffProvidersLookup = () => readonly ConnectionId[];

export const noOffProviders: OffProvidersLookup = () => [];

/**
 * The 409 answer for a request that names a provider the user switched off,
 * or null when the call may go on. Every model route runs this one check
 * before it fills a key or calls a provider, so the switch holds on the
 * server and not only in the browser that flipped it. A request with no
 * config runs on the server's own env provider, which no switch covers.
 */
export function providerOffResponse(
  request: Pick<ModelRequest, "config" | "fallbackConfig">,
  offProviders: OffProvidersLookup,
): Response | null {
  const connections = [request.config, request.fallbackConfig]
    .map((config) => connectionForProviderType(config?.provider))
    .filter((id): id is ConnectionId => id !== null);
  if (connections.length === 0) return null;
  const off = offProviders();
  for (const connection of connections) {
    const usability = connectionUsability(connection, off);
    if (!usability.usable) {
      return Response.json(
        { error: "provider_off", provider: usability.provider },
        { status: 409 },
      );
    }
  }
  return null;
}
