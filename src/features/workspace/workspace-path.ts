// Pure path rules of a bot's workspace folder. No file system access here.

/** Bot ids are safe as one path segment; anything else is refused. */
const BOT_ID = /^[A-Za-z0-9_-]{1,80}$/;

/** A relative path inside a workspace: no root, no "..", no hidden parts. */
const SEGMENT = /^[^/\\\0]{1,200}$/;

export const WORKSPACE_PATH_MAX = 500;

export function isWorkspaceBotId(botId: string): boolean {
  return BOT_ID.test(botId);
}

/**
 * The segments of a path the model asked for, or null when it could leave
 * the workspace or reach a hidden file. "" and "." mean the folder itself.
 */
export function workspaceSegments(path: string): string[] | null {
  if (path.length > WORKSPACE_PATH_MAX) return null;
  const trimmed = path.trim().replace(/^\.\/+/, "");
  if (trimmed === "" || trimmed === ".") return [];
  if (trimmed.startsWith("/") || trimmed.includes("\\")) return null;
  const parts = trimmed.split("/").filter((part) => part !== "");
  for (const part of parts) {
    if (!SEGMENT.test(part) || part === ".." || part === ".") return null;
    // Dotfiles (.env, .git) stay out of reach even inside the workspace.
    if (part.startsWith(".")) return null;
  }
  return parts;
}

/** True when `child` is `root` or inside it; both already resolved. */
export function isInsideRoot(root: string, child: string): boolean {
  const base = root.endsWith("/") ? root : `${root}/`;
  return child === root || child.startsWith(base);
}
