import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { workspaceSegments } from "./workspace-path.ts";
import {
  createWorkspaceListTool,
  createWorkspaceReadTool,
  parsePathArgs,
  workspaceTools,
  WORKSPACE_READ_MAX_BYTES,
} from "./server/workspace-tools.ts";

const ctx = { botId: "bot_a", signal: new AbortController().signal };

function withWorkspace(run: (root: string) => Promise<void>) {
  return async () => {
    const root = mkdtempSync(join(tmpdir(), "openbot-ws-"));
    const bot = join(root, "bot_a");
    mkdirSync(join(bot, "docs"), { recursive: true });
    writeFileSync(join(bot, "notes.md"), "# Notes\nhello");
    writeFileSync(join(bot, ".env"), "SECRET=1");
    writeFileSync(join(bot, "docs", "a.txt"), "inside");
    writeFileSync(join(root, "outside.txt"), "outside");
    mkdirSync(join(root, "bot_b"));
    writeFileSync(join(root, "bot_b", "theirs.txt"), "other bot");
    symlinkSync(join(root, "outside.txt"), join(bot, "escape.txt"));
    try {
      await run(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
}

test("paths that could leave the workspace or reach dotfiles are refused", () => {
  assert.deepEqual(workspaceSegments(""), []);
  assert.deepEqual(workspaceSegments("./docs/a.txt"), ["docs", "a.txt"]);
  for (const bad of [
    "/etc/passwd",
    "../bot_b/x",
    "docs/../../x",
    ".env",
    "a\\b",
    "docs/.git/x",
  ]) {
    assert.equal(workspaceSegments(bad), null, bad);
    assert.equal(parsePathArgs({ path: bad }).ok, false, bad);
  }
});

test("no tools without an absolute workspace root", () => {
  assert.equal(workspaceTools(undefined).length, 0);
  assert.equal(workspaceTools("relative/dir").length, 0);
  assert.equal(workspaceTools("/srv/openbot").length, 2);
});

test(
  "list shows the bot's own folder without dotfiles",
  withWorkspace(async (root) => {
    const result = await createWorkspaceListTool(root).run({ path: "" }, ctx);
    assert.ok(result.ok);
    assert.equal(result.text, "docs/\nescape.txt\nnotes.md");
  }),
);

test(
  "read returns a file of the bot's folder",
  withWorkspace(async (root) => {
    const tool = createWorkspaceReadTool(root);
    const result = await tool.run({ path: "docs/a.txt" }, ctx);
    assert.ok(result.ok);
    assert.equal(result.text, "inside");
  }),
);

test(
  "a symlink out of the folder is refused",
  withWorkspace(async (root) => {
    const result = await createWorkspaceReadTool(root).run(
      { path: "escape.txt" },
      ctx,
    );
    assert.deepEqual(result, { ok: false, code: "workspace_path" });
  }),
);

test(
  "another bot's folder and a missing folder are out of reach",
  withWorkspace(async (root) => {
    const tool = createWorkspaceReadTool(root);
    const other = await tool.run({ path: "theirs.txt" }, ctx);
    assert.deepEqual(other, { ok: false, code: "workspace_not_found" });
    const noFolder = await tool.run({ path: "x" }, { ...ctx, botId: "bot_zz" });
    assert.deepEqual(noFolder, { ok: false, code: "workspace_missing" });
    const badId = await tool.run({ path: "x" }, { ...ctx, botId: "../bot_b" });
    assert.deepEqual(badId, { ok: false, code: "workspace_bot" });
  }),
);

test(
  "large files are cut and binary files refused",
  withWorkspace(async (root) => {
    writeFileSync(
      join(root, "bot_a", "big.txt"),
      "a".repeat(WORKSPACE_READ_MAX_BYTES + 10),
    );
    writeFileSync(join(root, "bot_a", "bin.dat"), Buffer.from([1, 0, 2]));
    const tool = createWorkspaceReadTool(root);
    const big = await tool.run({ path: "big.txt" }, ctx);
    assert.ok(big.ok && big.text.includes("[cut at 64 KB"));
    const bin = await tool.run({ path: "bin.dat" }, ctx);
    assert.deepEqual(bin, { ok: false, code: "workspace_binary" });
  }),
);
