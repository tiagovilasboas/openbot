import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = resolve(repoRoot, "src");

function containsTypeScript(directory) {
  if (!existsSync(directory)) return false;

  return readdirSync(directory, { withFileTypes: true }).some((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return containsTypeScript(entryPath);
    return entry.isFile() && /\.tsx?$/.test(entry.name);
  });
}

if (!containsTypeScript(sourceRoot)) {
  console.log("TypeScript check skipped: no application source exists yet.");
  process.exit(0);
}

const compiler = resolve(repoRoot, "node_modules/typescript/bin/tsc");
const result = spawnSync(process.execPath, [compiler, "--noEmit"], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
