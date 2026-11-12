import assert from "node:assert/strict";
import test from "node:test";
import { createGithubListOpenItemsTool } from "./github-list-open-items.ts";

const ctx = () => ({ botId: "b", signal: new AbortController().signal });

const issue = (number: number, pr = false) => ({
  id: number,
  number,
  title: `Item ${number}`,
  user: { login: "ana" },
  html_url: `https://github.com/o/r/issues/${number}`,
  labels: [{ name: "bug" }],
  comments: 2,
  created_at: "2026-01-01T00:00:00Z",
  ...(pr ? { pull_request: {} } : {}),
});

function fakeFetch(response: Response) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

test("parseArgs accepts owner/repo/kind and refuses anything else", () => {
  const tool = createGithubListOpenItemsTool();
  assert.deepEqual(tool.parseArgs({ owner: "o", repo: "r" }), {
    ok: true,
    args: { owner: "o", repo: "r", kind: "all" },
  });
  assert.equal(
    tool.parseArgs({ owner: "o", repo: "r", kind: "pulls" }).ok,
    true,
  );
  for (const bad of [
    null,
    [],
    { owner: "o" },
    { owner: "o", repo: "r", kind: "stars" },
    { owner: "settings", repo: "r" },
    { owner: "o/x", repo: "r" },
    { owner: "o", repo: "r/../../x" },
    { owner: "o".repeat(101), repo: "r" },
  ]) {
    assert.equal(tool.parseArgs(bad).ok, false, JSON.stringify(bad));
  }
});

test("run lists items filtered by kind, with the signal on the fetch", async () => {
  const { fetchImpl, calls } = fakeFetch(
    Response.json([issue(1), issue(2, true)]),
  );
  const tool = createGithubListOpenItemsTool({ fetchImpl, token: "t" });
  const context = ctx();
  const result = await tool.run(
    { owner: "o", repo: "r", kind: "issues" },
    context,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.text, /^o\/r: 1 open issues/);
  assert.match(result.text, /#1 issue: Item 1 \(by ana, 2 comments\) \[bug\]/);
  assert.doesNotMatch(result.text, /#2/);
  assert.equal(calls[0].init?.signal, context.signal);
  assert.match(calls[0].url, /\/repos\/o\/r\/issues\?state=open/);
});

test("upstream failures become fixed codes without upstream text", async () => {
  const { fetchImpl } = fakeFetch(
    new Response(JSON.stringify({ message: "secret detail" }), { status: 404 }),
  );
  const tool = createGithubListOpenItemsTool({ fetchImpl });
  const result = await tool.run({ owner: "o", repo: "r", kind: "all" }, ctx());
  assert.deepEqual(result, { ok: false, code: "github_repo_not_found" });
});
