/** OpenRouter rejects every call without a key, free models included. */
export function routerNeedsApiKey(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === "openrouter.ai" || host.endsWith(".openrouter.ai");
  } catch {
    return false;
  }
}

/** A router config that OpenRouter will reject before any model runs. */
export function lacksRequiredRouterKey(
  baseUrl: string,
  apiKey: string | undefined,
): boolean {
  return routerNeedsApiKey(baseUrl) && !apiKey?.trim();
}
