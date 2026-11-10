/**
 * The link to render for an item, or null. Item URLs come from an API
 * response, so only https links on the GitHub host (or its subdomains) pass.
 */
export function safeGithubUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && !host.endsWith(".github.com")) return null;
  return url.href;
}
