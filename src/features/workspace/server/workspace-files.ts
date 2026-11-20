import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { resolveInWorkspace } from "./workspace-tools.ts";

export type WorkspaceFile = { path: string; bytes: number; modifiedAt: number };

export const LIBRARY_MAX_FILES = 500;
export const LIBRARY_MAX_DEPTH = 6;

/**
 * Every file in the bot's folder, newest first, for the file library.
 * Dotfiles, symlinks and anything past the depth or count caps stay out.
 */
export async function listWorkspaceFiles(
  root: string,
  botId: string,
): Promise<WorkspaceFile[] | null> {
  const resolved = await resolveInWorkspace(root, botId, "");
  if (!resolved.ok) return resolved.code === "workspace_missing" ? [] : null;
  const files: WorkspaceFile[] = [];
  async function walk(dir: string, prefix: string, depth: number) {
    if (depth > LIBRARY_MAX_DEPTH || files.length >= LIBRARY_MAX_FILES) return;
    const entries = await readdir(/* turbopackIgnore: true */ dir, {
      withFileTypes: true,
    }).catch(() => []);
    for (const entry of entries) {
      if (files.length >= LIBRARY_MAX_FILES) return;
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, relative, depth + 1);
      } else if (entry.isFile()) {
        const info = await lstat(/* turbopackIgnore: true */ full).catch(
          () => null,
        );
        if (info) {
          files.push({
            path: relative,
            bytes: info.size,
            modifiedAt: info.mtimeMs,
          });
        }
      }
    }
  }
  await walk(resolved.full, "", 0);
  return files.sort((a, b) => b.modifiedAt - a.modifiedAt);
}
