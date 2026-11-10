import { withApiHeaders } from "../server-guard/api-request-init.ts";
import type { GitHubItemsResult, GitHubRepoRef } from "./github-types.ts";

function isSuccessResult(
  data: unknown,
): data is Extract<GitHubItemsResult, { ok: true }> {
  const body = data as { ok?: unknown; items?: unknown } | null;
  return body?.ok === true && Array.isArray(body.items);
}

function isErrorResult(
  data: unknown,
): data is Extract<GitHubItemsResult, { ok: false }> {
  const body = data as { ok?: unknown; error?: unknown } | null;
  return body?.ok === false && typeof body.error === "string";
}

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

    const data: unknown = await response.json().catch(() => null);

    if (response.ok && isSuccessResult(data)) {
      return data;
    }

    if (isErrorResult(data)) {
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
