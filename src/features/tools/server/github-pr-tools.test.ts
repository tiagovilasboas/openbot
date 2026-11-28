import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createGithubCommentItemTool,
  createGithubCreatePullRequestTool,
  createGithubGetPullRequestTool,
} from "./github-pr-tools.ts";

const ctx = { botId: "b1", signal: new AbortController().signal };

describe("github PR workflow tools", () => {
  it("reads PR metadata, files and comments without asking", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/pulls/12")) {
        return new Response(
          JSON.stringify({
            number: 12,
            title: "Add dark mode",
            state: "open",
            draft: false,
            user: { login: "dev-bot" },
            head: { ref: "feat/dark" },
            base: { ref: "main" },
            body: "Applies dark theme",
            html_url: "https://github.com/acme/app/pull/12",
          }),
          { status: 200 },
        );
      }
      if (url.includes("/pulls/12/files")) {
        return new Response(
          JSON.stringify([
            {
              filename: "app.css",
              status: "modified",
              additions: 14,
              deletions: 2,
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify([
          {
            user: { login: "qa-bot" },
            body: "Checked edge cases",
            created_at: "2026-11-28T00:00:00Z",
          },
        ]),
        { status: 200 },
      );
    };

    const tool = createGithubGetPullRequestTool({ fetchImpl });
    assert.equal(tool.policy, "auto");
    const parsed = tool.parseArgs({ owner: "acme", repo: "app", number: 12 });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const res = await tool.run(parsed.args, ctx);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.match(res.text, /PR #12: Add dark mode/);
    assert.match(res.text, /feat\/dark -> main/);
    assert.match(res.text, /app\.css \(modified, \+14\/-2\)/);
    assert.match(res.text, /@qa-bot: Checked edge cases/);
  });

  it("refuses comment and PR creation without token and requires approval", async () => {
    const commentTool = createGithubCommentItemTool({});
    assert.equal(commentTool.policy, "ask");
    assert.equal(commentTool.allowAlways, false);
    const cp = commentTool.parseArgs({
      owner: "acme",
      repo: "app",
      number: 12,
      body: "QA found an error",
    });
    assert.equal(cp.ok, true);
    if (cp.ok) {
      const res = await commentTool.run(cp.args, ctx);
      assert.deepEqual(res, { ok: false, code: "github_token_required" });
    }

    const prTool = createGithubCreatePullRequestTool({});
    assert.equal(prTool.policy, "ask");
    assert.equal(prTool.allowAlways, false);
    const pp = prTool.parseArgs({
      owner: "acme",
      repo: "app",
      title: "Fix bug",
      head: "fix/bug",
    });
    assert.equal(pp.ok, true);
    if (pp.ok) {
      const res = await prTool.run(pp.args, ctx);
      assert.deepEqual(res, { ok: false, code: "github_token_required" });
    }
  });

  it("posts a comment and opens a PR when token is configured", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      assert.equal(init?.method, "POST");
      if (url.endsWith("/issues/12/comments")) {
        return new Response(
          JSON.stringify({
            id: 99,
            html_url: "https://github.com/acme/app/pull/12#issuecomment-99",
          }),
          { status: 201 },
        );
      }
      return new Response(
        JSON.stringify({
          number: 13,
          title: "Fix bug",
          html_url: "https://github.com/acme/app/pull/13",
        }),
        { status: 201 },
      );
    };

    const commentTool = createGithubCommentItemTool({
      fetchImpl,
      token: "ghp_test",
    });
    const cp = commentTool.parseArgs({
      owner: "acme",
      repo: "app",
      number: 12,
      body: "QA passed",
    });
    assert.equal(cp.ok, true);
    if (cp.ok) {
      const res = await commentTool.run(cp.args, ctx);
      assert.equal(res.ok, true);
      if (res.ok) assert.match(res.text, /Comment #99 posted/);
    }

    const prTool = createGithubCreatePullRequestTool({
      fetchImpl,
      token: "ghp_test",
    });
    const pp = prTool.parseArgs({
      owner: "acme",
      repo: "app",
      title: "Fix bug",
      head: "fix/bug",
      base: "main",
      draft: true,
    });
    assert.equal(pp.ok, true);
    if (pp.ok) {
      const res = await prTool.run(pp.args, ctx);
      assert.equal(res.ok, true);
      if (res.ok) assert.match(res.text, /Opened PR #13/);
    }
  });
});
