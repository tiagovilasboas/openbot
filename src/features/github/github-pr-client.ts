import type { GitHubRepoRef } from "./github-types.ts";

const GITHUB_API_BASE = "https://api.github.com";

export type GitHubPrClientOptions = {
  token?: string;
  fetchImpl?: typeof fetch;
};

export type GitHubPrError =
  | "token_required"
  | "not_found"
  | "unauthorized"
  | "rate_limited"
  | "validation_error"
  | "network_error";

export type PullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
};

export type PullRequestComment = {
  author: string;
  body: string;
  createdAt: string;
};

export type PullRequestDetails = {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  author: string;
  headRef: string;
  baseRef: string;
  body: string;
  url: string;
  files: PullRequestFile[];
  comments: PullRequestComment[];
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

function mapHttpError(response: Response): GitHubPrError {
  if (response.status === 404) return "not_found";
  if (response.status === 401) return "unauthorized";
  if (response.status === 422) return "validation_error";
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    return remaining === "0" || response.status === 429
      ? "rate_limited"
      : "unauthorized";
  }
  return "network_error";
}

function repoBase(repo: GitHubRepoRef): string {
  return `${GITHUB_API_BASE}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
}

export async function fetchPullRequestDetails(
  repo: GitHubRepoRef,
  prNumber: number,
  options: GitHubPrClientOptions = {},
): Promise<
  { ok: true; pr: PullRequestDetails } | { ok: false; error: GitHubPrError }
> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers = getHeaders(options.token);
  const base = repoBase(repo);

  try {
    const prRes = await fetchImpl(`${base}/pulls/${prNumber}`, {
      method: "GET",
      headers,
    });
    if (!prRes.ok) return { ok: false, error: mapHttpError(prRes) };
    const prData = (await prRes.json()) as Record<string, unknown>;

    const [filesRes, commentsRes] = await Promise.all([
      fetchImpl(`${base}/pulls/${prNumber}/files?per_page=30`, {
        method: "GET",
        headers,
      }),
      fetchImpl(`${base}/issues/${prNumber}/comments?per_page=15`, {
        method: "GET",
        headers,
      }),
    ]);

    const filesRaw = filesRes.ok ? ((await filesRes.json()) as unknown) : [];
    const commentsRaw = commentsRes.ok
      ? ((await commentsRes.json()) as unknown)
      : [];

    const user = (prData.user as Record<string, unknown> | undefined) ?? {};
    const head = (prData.head as Record<string, unknown> | undefined) ?? {};
    const baseObj = (prData.base as Record<string, unknown> | undefined) ?? {};

    const files: PullRequestFile[] = Array.isArray(filesRaw)
      ? filesRaw.map((f: Record<string, unknown>) => ({
          filename: String(f.filename ?? ""),
          status: String(f.status ?? "modified"),
          additions: Number(f.additions ?? 0),
          deletions: Number(f.deletions ?? 0),
        }))
      : [];

    const comments: PullRequestComment[] = Array.isArray(commentsRaw)
      ? commentsRaw.map((c: Record<string, unknown>) => {
          const authorObj =
            (c.user as Record<string, unknown> | undefined) ?? {};
          return {
            author: String(authorObj.login ?? "ghost"),
            body: String(c.body ?? ""),
            createdAt: String(c.created_at ?? ""),
          };
        })
      : [];

    return {
      ok: true,
      pr: {
        number: Number(prData.number ?? prNumber),
        title: String(prData.title ?? ""),
        state: String(prData.state ?? "open"),
        draft: Boolean(prData.draft),
        author: String(user.login ?? "ghost"),
        headRef: String(head.ref ?? ""),
        baseRef: String(baseObj.ref ?? ""),
        body: String(prData.body ?? ""),
        url: String(prData.html_url ?? ""),
        files,
        comments,
      },
    };
  } catch {
    return { ok: false, error: "network_error" };
  }
}

export async function postIssueOrPrComment(
  repo: GitHubRepoRef,
  itemNumber: number,
  body: string,
  options: GitHubPrClientOptions = {},
): Promise<
  { ok: true; id: number; url: string } | { ok: false; error: GitHubPrError }
> {
  if (!options.token || !options.token.trim()) {
    return { ok: false, error: "token_required" };
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(
      `${repoBase(repo)}/issues/${itemNumber}/comments`,
      {
        method: "POST",
        headers: {
          ...getHeaders(options.token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      },
    );
    if (!response.ok) return { ok: false, error: mapHttpError(response) };
    const data = (await response.json()) as Record<string, unknown>;
    return {
      ok: true,
      id: Number(data.id ?? 0),
      url: String(data.html_url ?? ""),
    };
  } catch {
    return { ok: false, error: "network_error" };
  }
}

export async function createPullRequest(
  repo: GitHubRepoRef,
  input: {
    title: string;
    head: string;
    base: string;
    body?: string;
    draft?: boolean;
  },
  options: GitHubPrClientOptions = {},
): Promise<
  | { ok: true; number: number; url: string; title: string }
  | { ok: false; error: GitHubPrError }
> {
  if (!options.token || !options.token.trim()) {
    return { ok: false, error: "token_required" };
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(`${repoBase(repo)}/pulls`, {
      method: "POST",
      headers: {
        ...getHeaders(options.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        head: input.head,
        base: input.base,
        body: input.body ?? "",
        draft: Boolean(input.draft),
      }),
    });
    if (!response.ok) return { ok: false, error: mapHttpError(response) };
    const data = (await response.json()) as Record<string, unknown>;
    return {
      ok: true,
      number: Number(data.number ?? 0),
      url: String(data.html_url ?? ""),
      title: String(data.title ?? input.title),
    };
  } catch {
    return { ok: false, error: "network_error" };
  }
}
