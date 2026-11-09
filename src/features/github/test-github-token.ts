import { withApiHeaders } from "../server-guard/api-request-init.ts";
export type GitHubTokenTestOutcome =
  | {
      ok: true;
      authenticated: boolean;
      user?: string;
      remaining: number;
      limit: number;
    }
  | { ok: false; error: "unauthorized" | "rate_limited" | "network_error" };

/** Asks the server whether GitHub accepts the token (or the public API). */
export async function testGitHubToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GitHubTokenTestOutcome> {
  try {
    const response = await fetchImpl(
      "/api/github/test",
      withApiHeaders({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.trim() || undefined }),
      }),
    );
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      authenticated?: boolean;
      user?: string;
      rateLimit?: { remaining: number; limit: number };
      error?: string;
    } | null;

    if (response.ok && data?.ok) {
      const authenticated = Boolean(data.authenticated);
      const fallback = authenticated ? 5000 : 60;
      return {
        ok: true,
        authenticated,
        ...(data.user ? { user: data.user } : {}),
        remaining: data.rateLimit?.remaining ?? fallback,
        limit: data.rateLimit?.limit ?? fallback,
      };
    }
    if (data?.error === "unauthorized" || data?.error === "rate_limited") {
      return { ok: false, error: data.error };
    }
    return { ok: false, error: "network_error" };
  } catch {
    return { ok: false, error: "network_error" };
  }
}
