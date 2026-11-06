import type {
  GitHubItem,
  GitHubItemsResult,
  GitHubRepoRef,
  GitHubTokenTestResult,
} from "./github-types.ts";

const GITHUB_API_BASE = "https://api.github.com";

export type GitHubClientOptions = {
  token?: string;
  fetchImpl?: typeof fetch;
};

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OpenBot",
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

export async function fetchRepositoryItems(
  repo: GitHubRepoRef,
  options: GitHubClientOptions = {},
): Promise<GitHubItemsResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = `${GITHUB_API_BASE}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/issues?state=open&per_page=30`;

  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: getHeaders(options.token),
    });

    if (response.status === 404) {
      return { ok: false, repo, error: "repo_not_found" };
    }

    if (response.status === 401) {
      return { ok: false, repo, error: "unauthorized" };
    }

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0" || response.status === 429) {
        return { ok: false, repo, error: "rate_limited" };
      }
      return { ok: false, repo, error: "unauthorized" };
    }

    if (!response.ok) {
      return { ok: false, repo, error: "network_error" };
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      return { ok: false, repo, error: "network_error" };
    }

    const items: GitHubItem[] = data.map((entry: Record<string, unknown>) => {
      const labels = Array.isArray(entry.labels)
        ? entry.labels
            .map((label: unknown) =>
              typeof label === "string"
                ? label
                : typeof label === "object" && label && "name" in label
                  ? String(label.name)
                  : "",
            )
            .filter(Boolean)
        : [];

      const user =
        typeof entry.user === "object" && entry.user !== null
          ? (entry.user as Record<string, unknown>)
          : {};

      return {
        id: Number(entry.id ?? 0),
        number: Number(entry.number ?? 0),
        title: String(entry.title ?? ""),
        author: String(user.login ?? "ghost"),
        authorAvatarUrl: user.avatar_url ? String(user.avatar_url) : undefined,
        url: String(entry.html_url ?? ""),
        labels,
        isPullRequest: Boolean(entry.pull_request),
        commentsCount: Number(entry.comments ?? 0),
        createdAt: String(entry.created_at ?? ""),
      };
    });

    return {
      ok: true,
      repo,
      items,
      totalCount: items.length,
    };
  } catch {
    return { ok: false, repo, error: "network_error" };
  }
}

export async function testGitHubConnection(
  token?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GitHubTokenTestResult> {
  const trimmedToken = token?.trim();
  const endpoint = trimmedToken
    ? `${GITHUB_API_BASE}/user`
    : `${GITHUB_API_BASE}/rate_limit`;

  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: getHeaders(trimmedToken),
    });

    if (response.status === 401) {
      return { ok: false, error: "unauthorized" };
    }

    if (response.status === 403 || response.status === 429) {
      return { ok: false, error: "rate_limited" };
    }

    if (!response.ok) {
      return { ok: false, error: "network_error" };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const remainingHeader = response.headers.get("x-ratelimit-remaining");
    const limitHeader = response.headers.get("x-ratelimit-limit");
    const resetHeader = response.headers.get("x-ratelimit-reset");

    const remaining = remainingHeader
      ? Number.parseInt(remainingHeader, 10)
      : undefined;
    const limit = limitHeader ? Number.parseInt(limitHeader, 10) : undefined;
    const resetTime = resetHeader
      ? new Date(Number.parseInt(resetHeader, 10) * 1000).toISOString()
      : new Date().toISOString();

    return {
      ok: true,
      authenticated: Boolean(trimmedToken),
      user: data.login ? String(data.login) : undefined,
      ...(remaining !== undefined && limit !== undefined
        ? { rateLimit: { remaining, limit, resetTime } }
        : {}),
    };
  } catch {
    return { ok: false, error: "network_error" };
  }
}
