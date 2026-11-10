import assert from "node:assert/strict";
import test from "node:test";
import { fetchRepositoryItems, testGitHubConnection } from "./github-client.ts";
import { listRepositoryItems } from "./list-repository-items.ts";
import { testGitHubToken } from "./test-github-token.ts";

const repo = { owner: "acme", repo: "app" };

type Call = { url: string; init: RequestInit | undefined };

function stubFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchImpl = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    const call = { url: String(url), init };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { calls, fetchImpl };
}

const throwing = (async () => {
  throw new TypeError("offline");
}) as typeof fetch;

// --- listRepositoryItems (client -> /api/github/items) ----------------------

test("listRepositoryItems posts the repo, and the token only when there is one", async () => {
  const { calls, fetchImpl } = stubFetch(() =>
    Response.json({ ok: true, repo, items: [], totalCount: 0 }),
  );
  await listRepositoryItems(repo, null, fetchImpl);
  await listRepositoryItems(repo, undefined, fetchImpl);
  await listRepositoryItems(repo, "", fetchImpl);
  await listRepositoryItems(repo, "ghp_x", fetchImpl);

  assert.equal(calls[0]?.url, "/api/github/items");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), repo);
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), repo);
  assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), repo);
  assert.deepEqual(JSON.parse(String(calls[3]?.init?.body)), {
    ...repo,
    token: "ghp_x",
  });
});

test("listRepositoryItems returns a successful payload as is", async () => {
  const payload = { ok: true, repo, items: [], totalCount: 0 };
  const { fetchImpl } = stubFetch(() => Response.json(payload));
  assert.deepEqual(await listRepositoryItems(repo, null, fetchImpl), payload);
});

test("listRepositoryItems prefers the server's typed error over the HTTP status", async () => {
  const body = { ok: false, repo, error: "rate_limited" };
  const { fetchImpl } = stubFetch(() => Response.json(body, { status: 404 }));
  assert.deepEqual(await listRepositoryItems(repo, null, fetchImpl), body);
});

test("listRepositoryItems maps bare HTTP statuses when the body is not JSON", async () => {
  const cases: Array<[number, string]> = [
    [404, "repo_not_found"],
    [429, "rate_limited"],
    [401, "unauthorized"],
    [500, "network_error"],
    [503, "network_error"],
  ];
  for (const [status, error] of cases) {
    const { fetchImpl } = stubFetch(() => new Response("<html>", { status }));
    assert.deepEqual(await listRepositoryItems(repo, null, fetchImpl), {
      ok: false,
      repo,
      error,
    });
  }
});

test("listRepositoryItems treats a 200 with an empty body as a network error", async () => {
  for (const body of ["", "null"]) {
    const { fetchImpl } = stubFetch(() => new Response(body, { status: 200 }));
    assert.deepEqual(await listRepositoryItems(repo, null, fetchImpl), {
      ok: false,
      repo,
      error: "network_error",
    });
  }
});

test("listRepositoryItems treats a 200 with a foreign JSON object as a network error", async () => {
  const { fetchImpl } = stubFetch(() => Response.json({}));
  assert.deepEqual(await listRepositoryItems(repo, null, fetchImpl), {
    ok: false,
    repo,
    error: "network_error",
  });
});

test("listRepositoryItems turns a thrown fetch into a network error", async () => {
  assert.deepEqual(await listRepositoryItems(repo, null, throwing), {
    ok: false,
    repo,
    error: "network_error",
  });
});

// --- testGitHubToken (client -> /api/github/test) ---------------------------

test("testGitHubToken trims the token and sends none for a blank one", async () => {
  const { calls, fetchImpl } = stubFetch(() =>
    Response.json({ ok: true, authenticated: true }),
  );
  await testGitHubToken("  ghp_x  ", fetchImpl);
  await testGitHubToken("   ", fetchImpl);
  assert.equal(calls[0]?.url, "/api/github/test");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    token: "ghp_x",
  });
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {});
});

test("testGitHubToken reports user and quota from the server", async () => {
  const { fetchImpl } = stubFetch(() =>
    Response.json({
      ok: true,
      authenticated: true,
      user: "ana",
      rateLimit: { remaining: 12, limit: 5000 },
    }),
  );
  assert.deepEqual(await testGitHubToken("t", fetchImpl), {
    ok: true,
    authenticated: true,
    user: "ana",
    remaining: 12,
    limit: 5000,
  });
});

test("testGitHubToken falls back to the documented quotas when the server omits them", async () => {
  const authed = stubFetch(() =>
    Response.json({ ok: true, authenticated: true }),
  );
  assert.deepEqual(await testGitHubToken("t", authed.fetchImpl), {
    ok: true,
    authenticated: true,
    remaining: 5000,
    limit: 5000,
  });
  const anon = stubFetch(() => Response.json({ ok: true }));
  assert.deepEqual(await testGitHubToken("", anon.fetchImpl), {
    ok: true,
    authenticated: false,
    remaining: 60,
    limit: 60,
  });
});

test("testGitHubToken keeps the unauthorized and rate_limited codes", async () => {
  for (const error of ["unauthorized", "rate_limited"] as const) {
    const { fetchImpl } = stubFetch(() =>
      Response.json({ ok: false, error }, { status: 401 }),
    );
    assert.deepEqual(await testGitHubToken("t", fetchImpl), {
      ok: false,
      error,
    });
  }
});

test("testGitHubToken maps unknown codes, bad bodies and thrown fetches to network_error", async () => {
  const network = { ok: false, error: "network_error" };
  for (const make of [
    () => Response.json({ ok: false, error: "weird" }, { status: 502 }),
    () => Response.json({ ok: false, error: "network_error" }, { status: 502 }),
    () => new Response("not json", { status: 500 }),
    () => Response.json({ ok: false }, { status: 200 }),
    () => Response.json(null, { status: 200 }),
  ]) {
    const { fetchImpl } = stubFetch(make);
    assert.deepEqual(await testGitHubToken("t", fetchImpl), network);
  }
  assert.deepEqual(await testGitHubToken("t", throwing), network);
});

// --- github-client edge cases ----------------------------------------------

test("fetchRepositoryItems url-encodes owner and repo and sends the bearer token trimmed", async () => {
  const { calls, fetchImpl } = stubFetch(() => Response.json([]));
  await fetchRepositoryItems(
    { owner: "a b", repo: "c/d" },
    { token: "  tok  ", fetchImpl },
  );
  assert.match(calls[0]?.url ?? "", /\/repos\/a%20b\/c%2Fd\/issues\?/);
  const headers = calls[0]?.init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer tok");
  assert.equal(headers["User-Agent"], "OpenBot");
});

test("fetchRepositoryItems omits Authorization for a blank token", async () => {
  const { calls, fetchImpl } = stubFetch(() => Response.json([]));
  await fetchRepositoryItems(repo, { token: "   ", fetchImpl });
  const headers = calls[0]?.init?.headers as Record<string, string>;
  assert.equal("Authorization" in headers, false);
});

test("fetchRepositoryItems separates a 403 rate limit from a 403 permission error", async () => {
  const limited = stubFetch(
    () =>
      new Response("", {
        status: 403,
        headers: { "x-ratelimit-remaining": "0" },
      }),
  );
  assert.deepEqual(
    await fetchRepositoryItems(repo, { fetchImpl: limited.fetchImpl }),
    { ok: false, repo, error: "rate_limited" },
  );

  const forbidden = stubFetch(
    () =>
      new Response("", {
        status: 403,
        headers: { "x-ratelimit-remaining": "42" },
      }),
  );
  const result = await fetchRepositoryItems(repo, {
    fetchImpl: forbidden.fetchImpl,
  });
  assert.deepEqual(result, { ok: false, repo, error: "unauthorized" });
});

test("fetchRepositoryItems maps labels, authors and PR flags with safe defaults", async () => {
  const { fetchImpl } = stubFetch(() =>
    Response.json([
      {
        id: 1,
        number: 5,
        title: "T",
        html_url: "u",
        user: { login: "ana", avatar_url: "a.png" },
        labels: ["plain", { name: "bug" }, { nope: 1 }, 7, null],
        pull_request: { url: "x" },
        comments: 3,
        created_at: "c",
      },
      {},
    ]),
  );
  const result = await fetchRepositoryItems(repo, { fetchImpl });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.totalCount, 2);
  const [first, second] = result.items;
  assert.deepEqual(first?.labels, ["plain", "bug"]);
  assert.equal(first?.isPullRequest, true);
  assert.equal(first?.authorAvatarUrl, "a.png");
  assert.equal(second?.author, "ghost");
  assert.equal(second?.isPullRequest, false);
  assert.equal(second?.title, "");
  assert.equal(second?.number, 0);
});

test("fetchRepositoryItems rejects a non-array body and an unreadable one", async () => {
  const objectBody = stubFetch(() => Response.json({ message: "x" }));
  assert.deepEqual(
    await fetchRepositoryItems(repo, { fetchImpl: objectBody.fetchImpl }),
    { ok: false, repo, error: "network_error" },
  );
  const badJson = stubFetch(() => new Response("{oops", { status: 200 }));
  assert.deepEqual(
    await fetchRepositoryItems(repo, { fetchImpl: badJson.fetchImpl }),
    { ok: false, repo, error: "network_error" },
  );
});

test("testGitHubConnection hits /rate_limit anonymously and /user with a token", async () => {
  const anon = stubFetch(() => Response.json({}));
  const anonResult = await testGitHubConnection(undefined, anon.fetchImpl);
  assert.equal(anon.calls[0]?.url, "https://api.github.com/rate_limit");
  assert.equal(anonResult.ok && anonResult.authenticated, false);

  const authed = stubFetch(() => Response.json({ login: "ana" }));
  const authedResult = await testGitHubConnection("  t  ", authed.fetchImpl);
  assert.equal(authed.calls[0]?.url, "https://api.github.com/user");
  assert.equal(authedResult.ok && authedResult.authenticated, true);
  assert.equal(authedResult.ok && authedResult.user, "ana");
});

test("testGitHubConnection omits the quota unless both headers are present", async () => {
  const onlyRemaining = stubFetch(() =>
    Response.json({}, { headers: { "x-ratelimit-remaining": "9" } }),
  );
  const result = await testGitHubConnection("t", onlyRemaining.fetchImpl);
  assert.equal(result.ok && "rateLimit" in result, false);
});

test("testGitHubConnection maps 401, 403, 429, 5xx and thrown fetches", async () => {
  const cases: Array<[number, string]> = [
    [401, "unauthorized"],
    [403, "rate_limited"],
    [429, "rate_limited"],
    [500, "network_error"],
  ];
  for (const [status, error] of cases) {
    const { fetchImpl } = stubFetch(() => new Response("", { status }));
    assert.deepEqual(await testGitHubConnection("t", fetchImpl), {
      ok: false,
      error,
    });
  }
  assert.deepEqual(await testGitHubConnection("t", throwing), {
    ok: false,
    error: "network_error",
  });
});
