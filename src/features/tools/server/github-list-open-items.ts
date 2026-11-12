import { fetchRepositoryItems } from "../../github/github-client.ts";
import type { GitHubItem } from "../../github/github-types.ts";
import { parseRepoReference } from "../../github/parse-repo-reference.ts";
import type { ToolDefinition } from "../tool-definition.ts";

export const GITHUB_LIST_OPEN_ITEMS = "github_list_open_items";

type ItemKind = "issues" | "pulls" | "all";
type Args = { owner: string; repo: string; kind: ItemKind };

const KINDS: readonly ItemKind[] = ["issues", "pulls", "all"];
const MAX_PART_CHARS = 100;

export type GithubToolDeps = {
  fetchImpl?: typeof fetch;
  /** Server-side token (GITHUB_TOKEN); never sent by the model. */
  token?: string;
};

function parseArgs(raw: unknown): { ok: true; args: Args } | { ok: false } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false };
  }
  const { owner, repo, kind } = raw as Record<string, unknown>;
  if (typeof owner !== "string" || typeof repo !== "string") {
    return { ok: false };
  }
  if (owner.length > MAX_PART_CHARS || repo.length > MAX_PART_CHARS) {
    return { ok: false };
  }
  const chosen = kind === undefined ? "all" : kind;
  if (!KINDS.includes(chosen as ItemKind)) return { ok: false };
  // The same parser the GitHub panel uses; it refuses paths and odd owners.
  const ref = parseRepoReference(`${owner.trim()}/${repo.trim()}`);
  if (!ref) return { ok: false };
  return { ok: true, args: { ...ref, kind: chosen as ItemKind } };
}

function line(item: GitHubItem): string {
  const type = item.isPullRequest ? "PR" : "issue";
  const labels = item.labels.length ? ` [${item.labels.join(", ")}]` : "";
  return `#${item.number} ${type}: ${item.title} (by ${item.author}, ${item.commentsCount} comments)${labels}`;
}

/**
 * Lists the open issues and pull requests of a public repository. Read-only,
 * so it runs without asking. Upstream failures become fixed codes.
 */
export function createGithubListOpenItemsTool(
  deps: GithubToolDeps = {},
): ToolDefinition<Args> {
  const baseFetch = deps.fetchImpl ?? fetch;
  return {
    name: GITHUB_LIST_OPEN_ITEMS,
    description:
      "List the open issues and pull requests of a GitHub repository (up to 30, newest first).",
    parameters: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        kind: { type: "string", enum: [...KINDS] },
      },
      required: ["owner", "repo"],
      additionalProperties: false,
    },
    policy: "auto",
    allowAlways: false,
    timeoutMs: 10_000,
    maxResultChars: 6_000,
    parseArgs,
    async run(args, ctx) {
      // fetchRepositoryItems takes no signal, so the abort rides on the fetch.
      const fetchImpl: typeof fetch = (input, init) =>
        baseFetch(input, { ...init, signal: ctx.signal });
      const result = await fetchRepositoryItems(
        { owner: args.owner, repo: args.repo },
        { fetchImpl, token: deps.token },
      );
      if (!result.ok) return { ok: false, code: `github_${result.error}` };
      const items = result.items.filter((item) =>
        args.kind === "all"
          ? true
          : args.kind === "pulls"
            ? item.isPullRequest
            : !item.isPullRequest,
      );
      const header = `${args.owner}/${args.repo}: ${items.length} open ${args.kind === "all" ? "items" : args.kind}`;
      return { ok: true, text: [header, ...items.map(line)].join("\n") };
    },
  };
}
