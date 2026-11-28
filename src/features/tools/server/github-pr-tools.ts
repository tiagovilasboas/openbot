import {
  createPullRequest,
  fetchPullRequestDetails,
  postIssueOrPrComment,
} from "../../github/github-pr-client.ts";
import { parseRepoReference } from "../../github/parse-repo-reference.ts";
import type { ToolDefinition } from "../tool-definition.ts";
import type { GithubToolDeps } from "./github-list-open-items.ts";

export const GITHUB_GET_PULL_REQUEST = "github_get_pull_request";
export const GITHUB_COMMENT_ITEM = "github_comment_item";
export const GITHUB_CREATE_PULL_REQUEST = "github_create_pull_request";

const MAX_PART_CHARS = 100;
const MAX_BODY_CHARS = 4_000;
const MAX_TITLE_CHARS = 256;
const MAX_REF_CHARS = 120;

function parseRepoAndNumber(raw: unknown):
  | {
      ok: true;
      owner: string;
      repo: string;
      number: number;
      record: Record<string, unknown>;
    }
  | { ok: false } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false };
  }
  const record = raw as Record<string, unknown>;
  const { owner, repo, number } = record;
  if (typeof owner !== "string" || typeof repo !== "string") {
    return { ok: false };
  }
  if (owner.length > MAX_PART_CHARS || repo.length > MAX_PART_CHARS) {
    return { ok: false };
  }
  if (
    typeof number !== "number" ||
    !Number.isInteger(number) ||
    number <= 0 ||
    number > 1_000_000_000
  ) {
    return { ok: false };
  }
  const ref = parseRepoReference(`${owner.trim()}/${repo.trim()}`);
  if (!ref) return { ok: false };
  return { ok: true, owner: ref.owner, repo: ref.repo, number, record };
}

/** Reads details, changed files and comments of a pull request (read-only). */
export function createGithubGetPullRequestTool(
  deps: GithubToolDeps = {},
): ToolDefinition<{ owner: string; repo: string; number: number }> {
  const baseFetch = deps.fetchImpl ?? fetch;
  return {
    name: GITHUB_GET_PULL_REQUEST,
    description:
      "Read a GitHub pull request's title, state, branches, body, changed files and recent comments.",
    parameters: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        number: { type: "number", description: "Pull request number" },
      },
      required: ["owner", "repo", "number"],
      additionalProperties: false,
    },
    policy: "auto",
    allowAlways: false,
    timeoutMs: 10_000,
    maxResultChars: 8_000,
    parseArgs(raw) {
      const parsed = parseRepoAndNumber(raw);
      return parsed.ok
        ? {
            ok: true,
            args: {
              owner: parsed.owner,
              repo: parsed.repo,
              number: parsed.number,
            },
          }
        : { ok: false };
    },
    async run(args, ctx) {
      const fetchImpl: typeof fetch = (input, init) =>
        baseFetch(input, { ...init, signal: ctx.signal });
      const res = await fetchPullRequestDetails(
        { owner: args.owner, repo: args.repo },
        args.number,
        { fetchImpl, token: deps.token },
      );
      if (!res.ok) return { ok: false, code: `github_${res.error}` };
      const { pr } = res;
      const lines = [
        `PR #${pr.number}: ${pr.title} [${pr.state}${pr.draft ? ", draft" : ""}]`,
        `Author: ${pr.author} | Branch: ${pr.headRef} -> ${pr.baseRef}`,
        `URL: ${pr.url}`,
      ];
      if (pr.body.trim()) {
        lines.push("", "Description:", pr.body.slice(0, 1_500));
      }
      if (pr.files.length > 0) {
        lines.push("", `Changed files (${pr.files.length}):`);
        for (const f of pr.files) {
          lines.push(
            `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`,
          );
        }
      }
      if (pr.comments.length > 0) {
        lines.push("", `Recent comments (${pr.comments.length}):`);
        for (const c of pr.comments) {
          lines.push(`- @${c.author}: ${c.body.slice(0, 400)}`);
        }
      }
      return { ok: true, text: lines.join("\n") };
    },
  };
}

/** Posts a comment on a GitHub issue or pull request (always asks first). */
export function createGithubCommentItemTool(
  deps: GithubToolDeps = {},
): ToolDefinition<{
  owner: string;
  repo: string;
  number: number;
  body: string;
}> {
  const baseFetch = deps.fetchImpl ?? fetch;
  return {
    name: GITHUB_COMMENT_ITEM,
    description:
      "Post a comment on a GitHub issue or pull request (requires GITHUB_TOKEN and user approval).",
    parameters: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        number: { type: "number", description: "Issue or PR number" },
        body: { type: "string", description: "Comment text in Markdown" },
      },
      required: ["owner", "repo", "number", "body"],
      additionalProperties: false,
    },
    policy: "ask",
    allowAlways: false,
    timeoutMs: 10_000,
    maxResultChars: 2_000,
    parseArgs(raw) {
      const parsed = parseRepoAndNumber(raw);
      if (!parsed.ok) return { ok: false };
      const body = parsed.record.body;
      if (
        typeof body !== "string" ||
        !body.trim() ||
        body.length > MAX_BODY_CHARS
      ) {
        return { ok: false };
      }
      return {
        ok: true,
        args: {
          owner: parsed.owner,
          repo: parsed.repo,
          number: parsed.number,
          body: body.trim(),
        },
      };
    },
    async run(args, ctx) {
      const fetchImpl: typeof fetch = (input, init) =>
        baseFetch(input, { ...init, signal: ctx.signal });
      const res = await postIssueOrPrComment(
        { owner: args.owner, repo: args.repo },
        args.number,
        args.body,
        { fetchImpl, token: deps.token },
      );
      if (!res.ok) return { ok: false, code: `github_${res.error}` };
      return {
        ok: true,
        text: `Comment #${res.id} posted on ${args.owner}/${args.repo}#${args.number}: ${res.url}`,
      };
    },
  };
}

/** Opens a pull request from an existing branch on GitHub (always asks first). */
export function createGithubCreatePullRequestTool(
  deps: GithubToolDeps = {},
): ToolDefinition<{
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;
  body: string;
  draft: boolean;
}> {
  const baseFetch = deps.fetchImpl ?? fetch;
  return {
    name: GITHUB_CREATE_PULL_REQUEST,
    description:
      "Create a pull request from an existing branch on GitHub (requires GITHUB_TOKEN and user approval).",
    parameters: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        title: { type: "string", description: "Pull request title" },
        head: { type: "string", description: "Source branch name" },
        base: {
          type: "string",
          description: "Target branch name (defaults to main)",
        },
        body: { type: "string", description: "Pull request description" },
        draft: { type: "boolean", description: "Open as draft PR" },
      },
      required: ["owner", "repo", "title", "head"],
      additionalProperties: false,
    },
    policy: "ask",
    allowAlways: false,
    timeoutMs: 10_000,
    maxResultChars: 2_000,
    parseArgs(raw) {
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return { ok: false };
      }
      const r = raw as Record<string, unknown>;
      if (typeof r.owner !== "string" || typeof r.repo !== "string") {
        return { ok: false };
      }
      if (r.owner.length > MAX_PART_CHARS || r.repo.length > MAX_PART_CHARS) {
        return { ok: false };
      }
      const ref = parseRepoReference(`${r.owner.trim()}/${r.repo.trim()}`);
      if (!ref) return { ok: false };
      if (
        typeof r.title !== "string" ||
        !r.title.trim() ||
        r.title.length > MAX_TITLE_CHARS
      ) {
        return { ok: false };
      }
      if (
        typeof r.head !== "string" ||
        !r.head.trim() ||
        r.head.length > MAX_REF_CHARS
      ) {
        return { ok: false };
      }
      const base =
        r.base === undefined
          ? "main"
          : typeof r.base === "string" &&
              r.base.trim() &&
              r.base.length <= MAX_REF_CHARS
            ? r.base.trim()
            : null;
      if (!base) return { ok: false };
      const body =
        r.body === undefined
          ? ""
          : typeof r.body === "string" && r.body.length <= MAX_BODY_CHARS
            ? r.body.trim()
            : null;
      if (body === null) return { ok: false };
      const draft = r.draft === undefined ? false : Boolean(r.draft);
      return {
        ok: true,
        args: {
          owner: ref.owner,
          repo: ref.repo,
          title: r.title.trim(),
          head: r.head.trim(),
          base,
          body,
          draft,
        },
      };
    },
    async run(args, ctx) {
      const fetchImpl: typeof fetch = (input, init) =>
        baseFetch(input, { ...init, signal: ctx.signal });
      const res = await createPullRequest(
        { owner: args.owner, repo: args.repo },
        {
          title: args.title,
          head: args.head,
          base: args.base,
          body: args.body,
          draft: args.draft,
        },
        { fetchImpl, token: deps.token },
      );
      if (!res.ok) return { ok: false, code: `github_${res.error}` };
      return {
        ok: true,
        text: `Opened PR #${res.number} (${res.title}): ${res.url}`,
      };
    },
  };
}
