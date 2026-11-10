import { testGitHubConnection } from "@/features/github/github-client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const body = (payload ?? {}) as { token?: unknown };

  const clientToken =
    typeof body.token === "string" && body.token.trim()
      ? body.token.trim()
      : undefined;
  const token = clientToken ?? process.env.GITHUB_TOKEN;

  const result = await testGitHubConnection(token);
  const status = result.ok
    ? 200
    : result.error === "unauthorized"
      ? 401
      : result.error === "rate_limited"
        ? 429
        : 502;
  return Response.json(result, { status });
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const result = await testGitHubConnection(token);
  return Response.json({
    configured: Boolean(token),
    ...result,
  });
}
