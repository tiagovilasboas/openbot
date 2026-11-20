import { lstat, readFile } from "node:fs/promises";
import { isWorkspaceBotId, workspaceSegments } from "../workspace-path.ts";
import { listWorkspaceFiles } from "./workspace-files.ts";
import { resolveInWorkspace, workspaceRootOf } from "./workspace-tools.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;
/** Largest file the library downloads; the tools write at most 64 KB. */
const DOWNLOAD_MAX_BYTES = 5 * 1024 * 1024;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

type Env = Readonly<Record<string, string | undefined>>;

/** GET /api/workspace/files?botId=: the bot's files, newest first. */
export async function handleListWorkspaceFiles(
  request: Request,
  env: Env = process.env,
): Promise<Response> {
  const root = workspaceRootOf(env.OPENBOT_WORKSPACE_DIR);
  if (!root) return json({ enabled: false, files: [] });
  const botId = new URL(request.url).searchParams.get("botId") ?? "";
  if (!isWorkspaceBotId(botId)) return json({ error: "invalid_id" }, 400);
  const files = await listWorkspaceFiles(root, botId);
  if (!files) return json({ error: "workspace_unreadable" }, 500);
  return json({ enabled: true, files });
}

/** GET /api/workspace/file?botId=&path=: downloads one file as an attachment. */
export async function handleDownloadWorkspaceFile(
  request: Request,
  env: Env = process.env,
): Promise<Response> {
  const root = workspaceRootOf(env.OPENBOT_WORKSPACE_DIR);
  if (!root) return json({ error: "workspace_disabled" }, 404);
  const params = new URL(request.url).searchParams;
  const botId = params.get("botId") ?? "";
  const relative = params.get("path") ?? "";
  const segments = workspaceSegments(relative);
  if (!isWorkspaceBotId(botId) || !segments?.length) {
    return json({ error: "invalid_path" }, 400);
  }
  const resolved = await resolveInWorkspace(root, botId, relative);
  if (!resolved.ok) return json({ error: resolved.code }, 404);
  const info = await lstat(/* turbopackIgnore: true */ resolved.full).catch(
    () => null,
  );
  if (!info?.isFile()) return json({ error: "workspace_not_file" }, 404);
  if (info.size > DOWNLOAD_MAX_BYTES) return json({ error: "too_large" }, 413);
  const bytes = await readFile(/* turbopackIgnore: true */ resolved.full);
  const name = segments[segments.length - 1].replace(/[^\w.-]+/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: {
      ...NO_STORE,
      // Never rendered inline: a file a model wrote is untrusted content.
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
