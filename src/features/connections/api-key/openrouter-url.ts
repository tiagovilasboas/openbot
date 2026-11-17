/**
 * Whether a router base URL points at OpenRouter: the host is `openrouter.ai`
 * or one of its subdomains, as `routerNeedsApiKey` in the model feature also
 * decides. The path, the query and lookalike hosts do not count.
 */
export function isOpenRouterUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === "openrouter.ai" || host.endsWith(".openrouter.ai");
  } catch {
    return false;
  }
}
