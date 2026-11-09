import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import "../../../../shared/testing/register-alias-resolver.mjs";

const { POST } = await import("./route.ts");

const realFetch = globalThis.fetch;
let savedToken: string | undefined;

beforeEach(() => {
  savedToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = savedToken;
});

function post(body: unknown, raw = false) {
  return POST(
    new Request("http://localhost/api/github/items", {
      method: "POST",
      body: raw ? String(body) : JSON.stringify(body),
    }),
  );
}

type Seen = { url: string; authorization: string | undefined };

function stubGitHub(response: () => Response) {
  const seen: Seen[] = [];
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    seen.push({ url: String(url), authorization: headers.Authorization });
    return response();
  }) as typeof fetch;
  return seen;
}

const issuePayload = [
  {
    id: 1,
    number: 7,
    title: "A bug",
    html_url: "https://github.com/acme/app/issues/7",
    user: { login: "ana" },
    labels: [{ name: "bug" }],
    comments: 2,
    created_at: "2026-01-01T00:00:00Z",
  },
];

test("a missing, malformed or reserved repo is a 400 invalid_repo", async () => {
  const bad: unknown[] = [
    null,
    {},
    { owner: "acme" },
    { owner: 1, repo: 2 },
    { owner: "", repo: "app" },
    { owner: "acme/evil", repo: "app" },
    { owner: "a b", repo: "app" },
  ];
  for (const body of bad) {
    const response = await post(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.deepEqual(await response.json(), {
      ok: false,
      error: "invalid_repo",
    });
  }
});

test("an unparsable body is an invalid repo", async () => {
  const response = await post("{oops", true);
  assert.equal(response.status, 400);
});

test("a valid repo returns the open items with 200", async () => {
  const seen = stubGitHub(() => Response.json(issuePayload));
  const response = await post({ owner: " acme ", repo: " app " });
  assert.equal(response.status, 200);
  const data = (await response.json()) as {
    ok: boolean;
    totalCount: number;
    items: Array<{ number: number; author: string; labels: string[] }>;
  };
  assert.equal(data.ok, true);
  assert.equal(data.totalCount, 1);
  assert.equal(data.items[0]?.number, 7);
  assert.equal(data.items[0]?.author, "ana");
  assert.deepEqual(data.items[0]?.labels, ["bug"]);
  assert.match(seen[0]?.url ?? "", /\/repos\/acme\/app\/issues\?/);
});

test("the token from the body wins over the server env", async () => {
  process.env.GITHUB_TOKEN = "env-token";
  const seen = stubGitHub(() => Response.json([]));
  await post({ owner: "acme", repo: "app", token: "  body-token  " });
  assert.equal(seen[0]?.authorization, "Bearer body-token");
});

test("the server env token is used when the body has none", async () => {
  process.env.GITHUB_TOKEN = "env-token";
  const seen = stubGitHub(() => Response.json([]));
  await post({ owner: "acme", repo: "app" });
  assert.equal(seen[0]?.authorization, "Bearer env-token");
});

test("a blank or non-string body token falls back to the env token", async () => {
  process.env.GITHUB_TOKEN = "env-token";
  const seen = stubGitHub(() => Response.json([]));
  await post({ owner: "acme", repo: "app", token: "   " });
  await post({ owner: "acme", repo: "app", token: 42 });
  assert.deepEqual(
    seen.map((s) => s.authorization),
    ["Bearer env-token", "Bearer env-token"],
  );
});

test("with no token anywhere the request is anonymous", async () => {
  const seen = stubGitHub(() => Response.json([]));
  await post({ owner: "acme", repo: "app" });
  assert.equal(seen[0]?.authorization, undefined);
});

test("GitHub errors map to repo_not_found 404, rate_limited 429, unauthorized 401", async () => {
  const cases: Array<[() => Response, number, string]> = [
    [() => new Response("", { status: 404 }), 404, "repo_not_found"],
    [() => new Response("", { status: 429 }), 429, "rate_limited"],
    [
      () =>
        new Response("", {
          status: 403,
          headers: { "x-ratelimit-remaining": "0" },
        }),
      429,
      "rate_limited",
    ],
    [() => new Response("", { status: 401 }), 401, "unauthorized"],
    [() => new Response("", { status: 403 }), 401, "unauthorized"],
    [() => new Response("", { status: 500 }), 502, "network_error"],
  ];
  for (const [make, status, error] of cases) {
    stubGitHub(make);
    const response = await post({ owner: "acme", repo: "app" });
    assert.equal(response.status, status, error);
    const data = (await response.json()) as { ok: boolean; error: string };
    assert.equal(data.ok, false);
    assert.equal(data.error, error);
  }
});

test("a network failure or non-array payload is a 502 network_error", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("offline");
  }) as typeof fetch;
  let response = await post({ owner: "acme", repo: "app" });
  assert.equal(response.status, 502);

  stubGitHub(() => Response.json({ message: "not a list" }));
  response = await post({ owner: "acme", repo: "app" });
  assert.equal(response.status, 502);
  assert.equal(
    ((await response.json()) as { error: string }).error,
    "network_error",
  );
});
