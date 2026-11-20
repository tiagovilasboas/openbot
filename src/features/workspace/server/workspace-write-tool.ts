import { lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_TOOL_ARGS_CHARS } from "../../model/tool-wire.ts";
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

export const WORKSPACE_WRITE = "workspace_write";

/**
 * Largest text one call may write, in UTF-8 bytes. A tool call's arguments
 * are capped at MAX_TOOL_ARGS_CHARS, so the file fits under that with room
 * for the path and the JSON around it.
 */
export const WORKSPACE_WRITE_MAX_BYTES = MAX_TOOL_ARGS_CHARS - 1024;

type Args = { path: string; content: string };

export function parseWriteArgs(raw: unknown): ParsedArgs<Args> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false };
  }
  const { path: target, content } = raw as Record<string, unknown>;
  if (typeof target !== "string" || typeof content !== "string") {
    return { ok: false };
  }
  const segments = workspaceSegments(target);
  if (!segments || segments.length === 0) return { ok: false };
  if (Buffer.byteLength(content, "utf8") > WORKSPACE_WRITE_MAX_BYTES) {
    return { ok: false };
  }
  return { ok: true, args: { path: segments.join("/"), content } };
}

type Written =
  { ok: true; created: boolean; bytes: number } | { ok: false; code: string };

/**
 * Writes one text file inside the bot's own folder, creating folders on the
 * way. Each folder is checked after it exists, so a symlink cannot carry the
 * write outside; an existing symlink or folder at the target is refused.
 */
export async function writeInWorkspace(
  root: string,
  botId: string,
  relative: string,
  content: string,
): Promise<Written> {
  if (!isWorkspaceBotId(botId)) return { ok: false, code: "workspace_bot" };
  const segments = workspaceSegments(relative);
  if (!segments?.length) return { ok: false, code: "workspace_path" };
  let botRoot: string;
  try {
    const realRoot = await realpath(/* turbopackIgnore: true */ root);
    await mkdir(/* turbopackIgnore: true */ path.join(realRoot, botId), {
      recursive: true,
    });
    botRoot = await realpath(
      /* turbopackIgnore: true */ path.join(realRoot, botId),
    );
    if (!isInsideRoot(realRoot, botRoot)) {
      return { ok: false, code: "workspace_path" };
    }
  } catch {
    return { ok: false, code: "workspace_missing" };
  }
  let parent = botRoot;
  for (const segment of segments.slice(0, -1)) {
    const next = path.join(parent, segment);
    try {
      await mkdir(/* turbopackIgnore: true */ next);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        return { ok: false, code: "workspace_not_folder" };
      }
    }
    const real = await realpath(/* turbopackIgnore: true */ next).catch(
      () => null,
    );
    if (!real || !isInsideRoot(botRoot, real)) {
      return { ok: false, code: "workspace_path" };
    }
    parent = real;
  }
  const target = path.join(parent, segments[segments.length - 1]);
  const existing = await lstat(/* turbopackIgnore: true */ target).catch(
    () => null,
  );
  if (existing && !existing.isFile()) {
    return { ok: false, code: "workspace_not_file" };
  }
  await writeFile(/* turbopackIgnore: true */ target, content, "utf8");
  return {
    ok: true,
    created: !existing,
    bytes: Buffer.byteLength(content, "utf8"),
  };
}

/** Writes a text file to the bot's workspace; asks before each write. */
export function createWorkspaceWriteTool(root: string): ToolDefinition<Args> {
  return {
    name: WORKSPACE_WRITE,
    description:
      "Create or replace a text file in this bot's workspace folder (up to 7 KB per call). Use it to deliver documents, notes or code the user asked for.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to the bot's workspace folder",
          maxLength: WORKSPACE_PATH_MAX,
        },
        content: { type: "string", description: "The whole file text" },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },
    policy: "ask",
    allowAlways: true,
    timeoutMs: 10_000,
    maxResultChars: 500,
    parseArgs: parseWriteArgs,
    async run(args, ctx) {
      if (ctx.signal.aborted) return { ok: false, code: "aborted" };
      const written = await writeInWorkspace(
        root,
        ctx.botId,
        args.path,
        args.content,
      );
      if (!written.ok) return written;
      const verb = written.created ? "Created" : "Replaced";
      return {
        ok: true,
        text: `${verb} ${args.path} (${written.bytes} bytes).`,
        preview: args.path,
      };
    },
  };
}
