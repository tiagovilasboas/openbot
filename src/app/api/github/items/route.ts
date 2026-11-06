import { fetchRepositoryItems } from "@/features/github/github-client";
import { parseRepoReference } from "@/features/github/parse-repo-reference";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const body = (payload ?? {}) as {
    owner?: unknown;
    repo?: unknown;
    token?: unknown;
  };

  const rawOwner = typeof body.owner === "string" ? body.owner.trim() : "";
  const rawRepo = typeof body.repo === "string" ? body.repo.trim() : "";
  const repoRef = parseRepoReference(`${rawOwner}/${rawRepo}`);

  if (!repoRef) {
    return Response.json({ ok: false, error: "invalid_repo" }, { status: 400 });
  }

  const clientToken =
    typeof body.token === "string" && body.token.trim()
      ? body.token.trim()
      : undefined;
  const token = clientToken ?? process.env.GITHUB_TOKEN;

  const result = await fetchRepositoryItems(repoRef, { token });
  if (!result.ok) {
    const status =
      result.error === "repo_not_found"
        ? 404
        : result.error === "rate_limited"
          ? 429
          : result.error === "unauthorized"
            ? 401
            : 502;
    return Response.json(result, { status });
  }

  return Response.json(result);
}
