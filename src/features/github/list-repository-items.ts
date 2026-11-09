import { withApiHeaders } from "../server-guard/api-request-init.ts";
import type { GitHubItemsResult, GitHubRepoRef } from "./github-types.ts";

export async function listRepositoryItems(
  repo: GitHubRepoRef,
  token?: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<GitHubItemsResult> {
  try {
    const response = await fetchImpl(
      "/api/github/items",
      withApiHeaders({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.repo,
          ...(token ? { token } : {}),
        }),
      }),
    );

    const data = (await response
      .json()
      .catch(() => null)) as GitHubItemsResult | null;

    if (response.ok && data?.ok) {
      return data;
    }

    if (data && !data.ok) {
      return data;
    }

    const fallbackError =
      response.status === 404
        ? "repo_not_found"
        : response.status === 429
          ? "rate_limited"
          : response.status === 401
            ? "unauthorized"
            : "network_error";

    return {
      ok: false,
      repo,
      error: fallbackError,
    };
  } catch {
    return { ok: false, repo, error: "network_error" };
  }
}
