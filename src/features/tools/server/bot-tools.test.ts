import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import { DEFAULT_BOT } from "../../bots/bot-types.ts";
import { listBots, replaceBots } from "../../bots/server/bots-repository.ts";
import {
  createCreateBotTool,
  createUpdateBotTool,
  parseCreateArgs,
  parseUpdateArgs,
} from "./bot-tools.ts";

async function withDb(run: (db: DatabaseSync) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-bot-tools-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const ctx = { botId: DEFAULT_BOT.id, signal: new AbortController().signal };

test("create needs a name and instructions within the bot limits", () => {
  assert.equal(parseCreateArgs({ name: "QA" }).ok, false);
  assert.equal(parseCreateArgs({ name: " ", instructions: "x" }).ok, false);
  assert.equal(
    parseCreateArgs({ name: "x".repeat(41), instructions: "y" }).ok,
    false,
  );
  assert.deepEqual(parseCreateArgs({ name: " QA ", instructions: " Test " }), {
    ok: true,
    args: { name: "QA", instructions: "Test" },
  });
});

test("update needs a bot id and at least one field", () => {
  assert.equal(parseUpdateArgs({ botId: "a" }).ok, false);
  assert.equal(parseUpdateArgs({ name: "b" }).ok, false);
  assert.equal(parseUpdateArgs({ botId: "a", title: 3 }).ok, false);
  assert.equal(parseUpdateArgs({ botId: "a", title: "Lead" }).ok, true);
});

test("both tools always ask and never offer always-allow", () => {
  withDb((db) => {
    for (const tool of [createCreateBotTool(db), createUpdateBotTool(db)]) {
      assert.equal(tool.policy, "ask");
      assert.equal(tool.allowAlways, false);
    }
  });
});

test("create refuses before the browser synced any bot", async () => {
  await withDb(async (db) => {
    const result = await createCreateBotTool(db).run(
      { name: "QA", instructions: "Tests things" },
      ctx,
    );
    assert.deepEqual(result, { ok: false, code: "bots_not_synced" });
    assert.equal(listBots(db).length, 0);
  });
});

test("create appends a bot and reports the change", async () => {
  await withDb(async (db) => {
    replaceBots(db, [DEFAULT_BOT]);
    const result = await createCreateBotTool(db).run(
      { name: "QA", title: "Tests", instructions: "You test things." },
      ctx,
    );
    assert.ok(result.ok);
    assert.deepEqual(result.effect, { kind: "bots_changed" });
    const bots = listBots(db);
    assert.equal(bots.length, 2);
    assert.equal(bots[0].id, DEFAULT_BOT.id);
    assert.equal(bots[1].name, "QA");
    assert.equal(bots[1].description, "You test things.");
  });
});

test("update changes only the given fields of one bot", async () => {
  await withDb(async (db) => {
    replaceBots(db, [DEFAULT_BOT]);
    const tool = createUpdateBotTool(db);
    const missing = await tool.run({ botId: "nope", name: "X" }, ctx);
    assert.deepEqual(missing, { ok: false, code: "bot_not_found" });
    const result = await tool.run(
      { botId: DEFAULT_BOT.id, title: "Lead" },
      ctx,
    );
    assert.ok(result.ok);
    const [bot] = listBots(db);
    assert.equal(bot.title, "Lead");
    assert.equal(bot.name, DEFAULT_BOT.name);
    assert.equal(bot.description, DEFAULT_BOT.description);
  });
});
