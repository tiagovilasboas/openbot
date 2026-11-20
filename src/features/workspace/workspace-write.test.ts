import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  handleDownloadWorkspaceFile,
  handleListWorkspaceFiles,
} from "./server/workspace-handler.ts";
import {
  createWorkspaceWriteTool,
  parseWriteArgs,
  WORKSPACE_WRITE_MAX_BYTES,
} from "./server/workspace-write-tool.ts";

const ctx = { botId: "bot_a", signal: new AbortController().signal };

function withRoot(run: (root: string) => Promise<void>) {
  return async () => {
    const root = mkdtempSync(join(tmpdir(), "openbot-wsw-"));
    try {
      await run(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
}

test("write args need a file path and text within 64 KB", () => {
  assert.equal(parseWriteArgs({ path: "", content: "x" }).ok, false);
  assert.equal(parseWriteArgs({ path: "../x", content: "x" }).ok, false);
  assert.equal(parseWriteArgs({ path: "a.md", content: 3 }).ok, false);
  assert.equal(
    parseWriteArgs({
      path: "a.md",
      content: "é".repeat(WORKSPACE_WRITE_MAX_BYTES),
    }).ok,
    false,
  );
  assert.deepEqual(parseWriteArgs({ path: "./docs//a.md", content: "" }), {
    ok: true,
    args: { path: "docs/a.md", content: "" },
  });
});

test(
  "writing creates the bot folder and subfolders, then replaces",
  withRoot(async (root) => {
    const tool = createWorkspaceWriteTool(root);
    const first = await tool.run({ path: "docs/plan.md", content: "v1" }, ctx);
    assert.ok(first.ok && first.text.startsWith("Created docs/plan.md"));
    const second = await tool.run({ path: "docs/plan.md", content: "v2" }, ctx);
    assert.ok(second.ok && second.text.startsWith("Replaced"));
    assert.equal(
      readFileSync(join(root, "bot_a", "docs", "plan.md"), "utf8"),
      "v2",
    );
  }),
);

test(
  "a symlinked folder or file cannot carry the write outside",
  withRoot(async (root) => {
    const outside = mkdtempSync(join(tmpdir(), "openbot-out-"));
    try {
      mkdirSync(join(root, "bot_a"));
      symlinkSync(outside, join(root, "bot_a", "link"));
      writeFileSync(join(outside, "t.txt"), "keep");
      symlinkSync(join(outside, "t.txt"), join(root, "bot_a", "f.txt"));
      const tool = createWorkspaceWriteTool(root);
      const viaDir = await tool.run({ path: "link/x.txt", content: "no" }, ctx);
      assert.deepEqual(viaDir, { ok: false, code: "workspace_path" });
      const viaFile = await tool.run({ path: "f.txt", content: "no" }, ctx);
      assert.deepEqual(viaFile, { ok: false, code: "workspace_not_file" });
      assert.equal(readFileSync(join(outside, "t.txt"), "utf8"), "keep");
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  }),
);

test(
  "the library lists files newest first and hides dotfiles",
  withRoot(async (root) => {
    const env = { OPENBOT_WORKSPACE_DIR: root };
    const none = await handleListWorkspaceFiles(
      new Request("http://x/api/workspace/files?botId=bot_a"),
      env,
    );
    assert.deepEqual(await none.json(), { enabled: true, files: [] });
    const tool = createWorkspaceWriteTool(root);
    await tool.run({ path: "a.txt", content: "a" }, ctx);
    await new Promise((r) => setTimeout(r, 15));
    await tool.run({ path: "sub/b.txt", content: "bb" }, ctx);
    writeFileSync(join(root, "bot_a", ".secret"), "x");
    const response = await handleListWorkspaceFiles(
      new Request("http://x/api/workspace/files?botId=bot_a"),
      env,
    );
    const body = (await response.json()) as { files: { path: string }[] };
    assert.deepEqual(
      body.files.map((f) => f.path),
      ["sub/b.txt", "a.txt"],
    );
  }),
);

test(
  "downloads are attachments and refuse paths out of the folder",
  withRoot(async (root) => {
    const env = { OPENBOT_WORKSPACE_DIR: root };
    await createWorkspaceWriteTool(root).run(
      { path: "r.html", content: "<script>x</script>" },
      ctx,
    );
    const ok = await handleDownloadWorkspaceFile(
      new Request("http://x/api/workspace/file?botId=bot_a&path=r.html"),
      env,
    );
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("content-type"), "application/octet-stream");
    assert.match(ok.headers.get("content-disposition") ?? "", /^attachment/);
    const bad = await handleDownloadWorkspaceFile(
      new Request("http://x/api/workspace/file?botId=bot_a&path=../x"),
      env,
    );
    assert.equal(bad.status, 400);
    const off = await handleListWorkspaceFiles(
      new Request("http://x/api/workspace/files?botId=bot_a"),
      {},
    );
    assert.deepEqual(await off.json(), { enabled: false, files: [] });
  }),
);
