import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import type {
  ParsedArgs,
  ToolDefinition,
} from "../../tools/tool-definition.ts";
import {
  WORKSPACE_PATH_MAX,
  isInsideRoot,
  isWorkspaceBotId,
  workspaceSegments,
} from "../workspace-path.ts";

export const WORKSPACE_LIST = "workspace_list";
export const WORKSPACE_READ = "workspace_read";

/** Bytes read from one file; the rest is cut and the text says so. */
export const WORKSPACE_READ_MAX_BYTES = 64 * 1024;
export const WORKSPACE_LIST_MAX_ENTRIES = 200;

type Args = { path: string };

export function parsePathArgs(raw: unknown): ParsedArgs<Args> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false };
  }
  const value = (raw as Record<string, unknown>).path ?? "";
  if (typeof value !== "string" || workspaceSegments(value) === null) {
    return { ok: false };
  }
  return { ok: true, args: { path: value } };
}

type Resolved = { ok: true; full: string } | { ok: false; code: string };

/**
 * The real path of a workspace entry. Symlinks are followed and the result
 * must still sit inside the bot's own folder, so a link cannot escape it.
 */
export async function resolveInWorkspace(
  root: string,
  botId: string,
  relative: string,
): Promise<Resolved> {
  if (!isWorkspaceBotId(botId)) return { ok: false, code: "workspace_bot" };
  const segments = workspaceSegments(relative);
  if (!segments) return { ok: false, code: "workspace_path" };
  let botRoot: string;
  try {
    botRoot = await realpath(path.join(root, botId));
  } catch {
    return { ok: false, code: "workspace_missing" };
  }
  try {
    const full = await realpath(path.join(botRoot, ...segments));
    return isInsideRoot(botRoot, full)
      ? { ok: true, full }
      : { ok: false, code: "workspace_path" };
  } catch {
    return { ok: false, code: "workspace_not_found" };
  }
}

const PATH_PARAM = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description:
        "Path relative to the bot's workspace folder; empty for the folder itself",
      maxLength: WORKSPACE_PATH_MAX,
    },
  },
  additionalProperties: false,
} as const;

/** Lists one folder of the bot's workspace. Read only. */
export function createWorkspaceListTool(root: string): ToolDefinition<Args> {
  return {
    name: WORKSPACE_LIST,
    description:
      "List the files and folders in this bot's workspace folder (read only).",
    parameters: PATH_PARAM,
    policy: "ask",
    allowAlways: true,
    timeoutMs: 5_000,
    maxResultChars: 8_000,
    parseArgs: parsePathArgs,
    async run(args, ctx) {
      if (ctx.signal.aborted) return { ok: false, code: "aborted" };
      const resolved = await resolveInWorkspace(root, ctx.botId, args.path);
      if (!resolved.ok) return resolved;
      let entries;
      try {
        entries = await readdir(resolved.full, { withFileTypes: true });
      } catch {
        return { ok: false, code: "workspace_not_folder" };
      }
      const lines = entries
        .filter((entry) => !entry.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, WORKSPACE_LIST_MAX_ENTRIES)
        .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
      const text = lines.length ? lines.join("\n") : "(empty folder)";
      return { ok: true, text, preview: `${lines.length} item(s)` };
    },
  };
}

/** Reads one text file of the bot's workspace, capped in size. Read only. */
export function createWorkspaceReadTool(root: string): ToolDefinition<Args> {
  return {
    name: WORKSPACE_READ,
    description:
      "Read a text file from this bot's workspace folder (read only, first 64 KB).",
    parameters: { ...PATH_PARAM, required: ["path"] },
    policy: "ask",
    allowAlways: true,
    timeoutMs: 5_000,
    maxResultChars: WORKSPACE_READ_MAX_BYTES,
    parseArgs: parsePathArgs,
    async run(args, ctx) {
      if (ctx.signal.aborted) return { ok: false, code: "aborted" };
      const resolved = await resolveInWorkspace(root, ctx.botId, args.path);
      if (!resolved.ok) return resolved;
      const info = await lstat(resolved.full).catch(() => null);
      if (!info?.isFile()) return { ok: false, code: "workspace_not_file" };
      const bytes = await readFile(resolved.full);
      if (bytes.subarray(0, 8000).includes(0)) {
        return { ok: false, code: "workspace_binary" };
      }
      const cut = bytes.length > WORKSPACE_READ_MAX_BYTES;
      const text = bytes.subarray(0, WORKSPACE_READ_MAX_BYTES).toString("utf8");
      return {
        ok: true,
        text: cut ? `${text}\n[cut at 64 KB of ${bytes.length} bytes]` : text,
        preview: args.path,
      };
    },
  };
}

/** The workspace tools, only when the server names a workspace root. */
export function workspaceTools(
  root: string | undefined,
): ToolDefinition<Args>[] {
  const trimmed = root?.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) return [];
  return [createWorkspaceListTool(trimmed), createWorkspaceReadTool(trimmed)];
}
