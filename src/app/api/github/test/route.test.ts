import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import "../../../../shared/testing/register-alias-resolver.mjs";

const { POST, GET } = await import("./route.ts");

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

function post(body: unknown, raw = false) {
  return POST(
    new Request("http://localhost/api/github/test", {
      method: "POST",
      body: raw ? String(body) : JSON.stringify(body),
    }),
  );
}

const rateHeaders = {
  "x-ratelimit-remaining": "4990",
  "x-ratelimit-limit": "5000",
  "x-ratelimit-reset": "1800000000",
};

test("a body token is verified against /user and reports the login and quota", async () => {
  const seen = stubGitHub(() =>
    Response.json({ login: "ana" }, { headers: rateHeaders }),
  );
  const response = await post({ token: " ghp_test " });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    authenticated: true,
    user: "ana",
    rateLimit: {
      remaining: 4990,
      limit: 5000,
      resetTime: new Date(1800000000 * 1000).toISOString(),
    },
  });
  assert.equal(seen[0]?.url, "https://api.github.com/user");
  assert.equal(seen[0]?.authorization, "Bearer ghp_test");
});

test("without any token the public rate_limit endpoint is used anonymously", async () => {
  const seen = stubGitHub(() => Response.json({}, { headers: rateHeaders }));
  const response = await post({});
  assert.equal(response.status, 200);
  const data = (await response.json()) as { authenticated: boolean };
  assert.equal(data.authenticated, false);
  assert.equal(seen[0]?.url, "https://api.github.com/rate_limit");
  assert.equal(seen[0]?.authorization, undefined);
});

test("the body token wins over the env token, and env is the fallback", async () => {
  process.env.GITHUB_TOKEN = "env-token";
  const seen = stubGitHub(() => Response.json({ login: "x" }));
  await post({ token: "body-token" });
  await post({ token: "  " });
  await post("{broken", true);
  assert.deepEqual(
    seen.map((s) => s.authorization),
    ["Bearer body-token", "Bearer env-token", "Bearer env-token"],
  );
});

test("401 maps to unauthorized, 403 and 429 to a 429 rate_limited, others to network_error", async () => {
  const cases: Array<[number, number, string]> = [
    [401, 401, "unauthorized"],
    [403, 429, "rate_limited"],
    [429, 429, "rate_limited"],
    [500, 502, "network_error"],
  ];
  for (const [upstream, status, error] of cases) {
    stubGitHub(() => new Response("", { status: upstream }));
    const response = await post({ token: "t" });
    assert.equal(response.status, status, String(upstream));
    assert.deepEqual(await response.json(), { ok: false, error });
  }
});

test("a network failure is a 502 network_error", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("offline");
  }) as typeof fetch;
  const response = await post({ token: "t" });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "network_error",
  });
});

test("GET reports configured=false without an env token and never reads one from the request", async () => {
  const seen = stubGitHub(() => Response.json({}, { headers: rateHeaders }));
  const data = (await (await GET()).json()) as {
    configured: boolean;
    authenticated: boolean;
  };
  assert.equal(data.configured, false);
  assert.equal(data.authenticated, false);
  assert.equal(seen[0]?.authorization, undefined);
});

test("GET reports configured=true and uses the env token", async () => {
  process.env.GITHUB_TOKEN = "env-token";
  const seen = stubGitHub(() => Response.json({ login: "bot" }));
  const data = (await (await GET()).json()) as {
    configured: boolean;
    user: string;
  };
  assert.equal(data.configured, true);
  assert.equal(data.user, "bot");
  assert.equal(seen[0]?.authorization, "Bearer env-token");
});

test("GET always answers 200, even when GitHub fails", async () => {
  process.env.GITHUB_TOKEN = "env-token";
  stubGitHub(() => new Response("", { status: 401 }));
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    configured: true,
    ok: false,
    error: "unauthorized",
  });
});
