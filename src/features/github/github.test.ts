import assert from "node:assert/strict";
import test from "node:test";
import { fetchRepositoryItems, testGitHubConnection } from "./github-client.ts";
import {
  clearStoredGitHubToken,
  loadStoredGitHubToken,
  sanitizeGitHubToken,
  saveStoredGitHubToken,
} from "./github-config.ts";
import { detectGitHubRequest } from "./detect-github-request.ts";
import { parseRepoReference } from "./parse-repo-reference.ts";

test("parseRepoReference parses various valid repository formats", () => {
  assert.deepEqual(parseRepoReference("tiagovilasboas/openbot"), {
    owner: "tiagovilasboas",
    repo: "openbot",
  });
  assert.deepEqual(parseRepoReference("https://github.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
  assert.deepEqual(
    parseRepoReference("https://github.com/vercel/next.js/issues"),
    {
      owner: "vercel",
      repo: "next.js",
    },
  );
  assert.deepEqual(
    parseRepoReference("git@github.com:tailwindlabs/tailwindcss.git"),
    {
      owner: "tailwindlabs",
      repo: "tailwindcss",
    },
  );
});

test("parseRepoReference rejects invalid or reserved repository formats", () => {
  assert.equal(parseRepoReference(""), null);
  assert.equal(parseRepoReference("singleword"), null);
  assert.equal(parseRepoReference("too/many/nested/slashes"), null);
  assert.equal(parseRepoReference("https://github.com/settings/profile"), null);
  assert.equal(parseRepoReference("e/ou"), null);
});

test("detectGitHubRequest identifies user intent and extracts repo reference", () => {
  const issuesPt = detectGitHubRequest(
    "Quero ver as issues de tiagovilasboas/openbot",
  );
  assert.equal(issuesPt.isGitHubRequest, true);
  if (issuesPt.isGitHubRequest) {
    assert.deepEqual(issuesPt.repo, {
      owner: "tiagovilasboas",
      repo: "openbot",
    });
    assert.equal(issuesPt.itemType, "issues");
  }

  const prsEn = detectGitHubRequest("Show open PRs for facebook/react");
  assert.equal(prsEn.isGitHubRequest, true);
  if (prsEn.isGitHubRequest) {
    assert.deepEqual(prsEn.repo, {
      owner: "facebook",
      repo: "react",
    });
    assert.equal(prsEn.itemType, "prs");
  }

  const urlOnly = detectGitHubRequest("https://github.com/vercel/next.js");
  assert.equal(urlOnly.isGitHubRequest, true);
  if (urlOnly.isGitHubRequest) {
    assert.deepEqual(urlOnly.repo, {
      owner: "vercel",
      repo: "next.js",
    });
    assert.equal(urlOnly.itemType, "all");
  }

  const plainText = detectGitHubRequest("Bom dia, como você funciona?");
  assert.equal(plainText.isGitHubRequest, false);
});

test("fetchRepositoryItems parses GitHub API payload extracting issues and PRs", async () => {
  const mockPayload = [
    {
      id: 101,
      number: 1,
      title: "First issue",
      html_url: "https://github.com/owner/repo/issues/1",
      user: { login: "alice", avatar_url: "https://avatar/1" },
      labels: [{ name: "bug" }, { name: "p1" }],
      comments: 4,
      created_at: "2026-11-01T10:00:00Z",
    },
    {
      id: 102,
      number: 2,
      title: "Add feature",
      html_url: "https://github.com/owner/repo/pull/2",
      user: { login: "bob" },
      labels: [{ name: "enhancement" }],
      pull_request: { url: "https://api.github.com/repos/owner/repo/pulls/2" },
      comments: 0,
      created_at: "2026-11-02T12:00:00Z",
    },
  ];

  let seenHeaders: HeadersInit | undefined;
  const mockFetch: typeof fetch = async (_url, init) => {
    seenHeaders = init?.headers;
    return new Response(JSON.stringify(mockPayload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await fetchRepositoryItems(
    { owner: "owner", repo: "repo" },
    { token: "test-token", fetchImpl: mockFetch },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].isPullRequest, false);
    assert.equal(result.items[0].author, "alice");
    assert.deepEqual(result.items[0].labels, ["bug", "p1"]);

    assert.equal(result.items[1].isPullRequest, true);
    assert.equal(result.items[1].author, "bob");
  }

  assert.equal(
    (seenHeaders as Record<string, string>)?.Authorization,
    "Bearer test-token",
  );
  assert.equal(
    (seenHeaders as Record<string, string>)?.["User-Agent"],
    "OpenBot",
  );
});

test("fetchRepositoryItems maps HTTP errors to typed codes", async () => {
  const notFoundFetch: typeof fetch = async () =>
    new Response("", { status: 404 });
  const notFound = await fetchRepositoryItems(
    { owner: "o", repo: "r" },
    { fetchImpl: notFoundFetch },
  );
  assert.equal(notFound.ok, false);
  if (!notFound.ok) assert.equal(notFound.error, "repo_not_found");

  const rateLimitFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
      status: 403,
      headers: { "x-ratelimit-remaining": "0" },
    });
  const rateLimited = await fetchRepositoryItems(
    { owner: "o", repo: "r" },
    { fetchImpl: rateLimitFetch },
  );
  assert.equal(rateLimited.ok, false);
  if (!rateLimited.ok) assert.equal(rateLimited.error, "rate_limited");

  const unauthFetch: typeof fetch = async () =>
    new Response("", { status: 401 });
  const unauth = await fetchRepositoryItems(
    { owner: "o", repo: "r" },
    { fetchImpl: unauthFetch },
  );
  assert.equal(unauth.ok, false);
  if (!unauth.ok) assert.equal(unauth.error, "unauthorized");

  const downFetch: typeof fetch = async () => {
    throw new Error("offline");
  };
  const networkErr = await fetchRepositoryItems(
    { owner: "o", repo: "r" },
    { fetchImpl: downFetch },
  );
  assert.equal(networkErr.ok, false);
  if (!networkErr.ok) assert.equal(networkErr.error, "network_error");
});

test("testGitHubConnection validates authentication and rate limit responses", async () => {
  const authFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ login: "octocat" }), {
      status: 200,
      headers: {
        "x-ratelimit-remaining": "4999",
        "x-ratelimit-limit": "5000",
        "x-ratelimit-reset": "1762460000",
      },
    });

  const authResult = await testGitHubConnection("token-123", authFetch);
  assert.equal(authResult.ok, true);
  if (authResult.ok) {
    assert.equal(authResult.authenticated, true);
    assert.equal(authResult.user, "octocat");
    assert.equal(authResult.rateLimit?.remaining, 4999);
  }
});

test("sanitizeGitHubToken validates token format", () => {
  assert.equal(sanitizeGitHubToken("  ghp_123456789  "), "ghp_123456789");
  assert.equal(sanitizeGitHubToken(""), null);
  assert.equal(sanitizeGitHubToken(null), null);
  assert.equal(sanitizeGitHubToken("a".repeat(500)), null);
});
