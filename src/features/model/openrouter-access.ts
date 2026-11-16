export type OpenRouterAccess = "connected" | "connect";

/** A saved router key means OpenRouter is connected; otherwise offer to connect. */
export function describeOpenRouterAccess(
  hasRouterKey: boolean,
): OpenRouterAccess {
  return hasRouterKey ? "connected" : "connect";
}
