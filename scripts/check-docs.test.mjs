import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const checker = join(repoRoot, "scripts/check-docs.mjs");

test("documentation checker accepts the repository's required documents", () => {
  const result = spawnSync(process.execPath, [checker], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Required project documents exist/);
});

test("documentation checker fails when required documents are missing", () => {
  const emptyDirectory = mkdtempSync(join(tmpdir(), "openbot-doc-check-"));
  try {
    const result = spawnSync(process.execPath, [checker], {
      cwd: emptyDirectory,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /README\.md/);
  } finally {
    rmSync(emptyDirectory, { recursive: true, force: true });
  }
});
