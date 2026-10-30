import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const appEntrypoints = [
  "src/app/page.js",
  "src/app/page.jsx",
  "src/app/page.ts",
  "src/app/page.tsx",
  "src/pages/index.js",
  "src/pages/index.jsx",
  "src/pages/index.ts",
  "src/pages/index.tsx",
];

if (
  !appEntrypoints.some((entrypoint) =>
    existsSync(resolve(repoRoot, entrypoint)),
  )
) {
  console.log("Next.js build skipped: no application entrypoint exists yet.");
  process.exit(0);
}

const nextCli = resolve(repoRoot, "node_modules/next/dist/bin/next");
const result = spawnSync(process.execPath, [nextCli, "build"], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
