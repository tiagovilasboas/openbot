export type GitHubRepoRef = {
  owner: string;
  repo: string;
};

export type GitHubItem = {
  id: number;
  number: number;
  title: string;
  author: string;
  authorAvatarUrl?: string;
  url: string;
  labels: string[];
  isPullRequest: boolean;
  commentsCount: number;
  createdAt: string;
};

export type GitHubErrorCode =
  | "repo_not_found"
  | "rate_limited"
  | "unauthorized"
  | "network_error"
  | "invalid_repo";

export type GitHubItemsResult =
  | {
      ok: true;
      repo: GitHubRepoRef;
      items: GitHubItem[];
      totalCount: number;
    }
  | {
      ok: false;
      repo?: GitHubRepoRef;
      error: GitHubErrorCode;
      message?: string;
    };

export type GitHubTokenTestResult =
  | {
      ok: true;
      authenticated: boolean;
      user?: string;
      rateLimit?: {
        remaining: number;
        limit: number;
        resetTime: string;
      };
    }
  | {
      ok: false;
      error: GitHubErrorCode;
      message?: string;
    };
