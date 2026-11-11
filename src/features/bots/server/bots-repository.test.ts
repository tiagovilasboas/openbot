import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import { DEFAULT_BOT, type BotProfile } from "../bot-types.ts";
import {
  listBots,
  readSelection,
  replaceBots,
  writeSelection,
} from "./bots-repository.ts";
import { validateBotsWrite } from "./validate-bots-write.ts";

function withDb(run: (db: DatabaseSync) => void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-bots-"));
  const db = openLocalStore(dir);
  try {
    run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const skill = (id: string) => ({
  id,
  name: `Skill ${id}`,
  description: "d",
  instructions: "do it",
  command: `/${id}`,
  isBuiltin: false,
  source: "created",
  createdAt: "2026-02-02T00:00:00.000Z",
});

const bot = (id: string, skills: unknown[] = []): BotProfile =>
  ({ ...DEFAULT_BOT, id, name: id, skills }) as BotProfile;

function valid(bots: unknown): BotProfile[] {
  const result = validateBotsWrite(bots);
  assert.ok(result.ok);
  return result.bots;
}

test("a list round-trips with its order and each bot's skills", () => {
  withDb((db) => {
    assert.deepEqual(listBots(db), []);
    const bots = valid([
      bot("b", [skill("s1"), skill("s2")]),
      bot("a"),
      bot("c", [skill("s3")]),
    ]);
    replaceBots(db, bots);
    const read = listBots(db);
    assert.deepEqual(
      read.map((b) => b.id),
      ["b", "a", "c"],
    );
    assert.deepEqual(
      read.map((b) => b.skills.map((s) => s.id)),
      [["s1", "s2"], [], ["s3"]],
    );
    assert.deepEqual(read, bots);
  });
});

test("replacing swaps the list and drops bots that are gone", () => {
  withDb((db) => {
    replaceBots(db, valid([bot("a"), bot("b")]));
    replaceBots(db, valid([bot("b"), bot("c")]));
    assert.deepEqual(
      listBots(db).map((b) => b.id),
      ["b", "c"],
    );
  });
});

test("a failed replace keeps the previous list and selection", () => {
  withDb((db) => {
    replaceBots(db, valid([bot("a"), bot("b")]), { activeBotId: "b" });
    const duplicate = valid([bot("x"), bot("y")]);
    // Two rows with one id break the primary key halfway through the insert.
    assert.throws(() =>
      replaceBots(db, [duplicate[0]!, duplicate[0]!], { activeBotId: "x" }),
    );
    assert.deepEqual(
      listBots(db).map((b) => b.id),
      ["a", "b"],
    );
    assert.equal(readSelection(db).activeBotId, "b");
  });
});

test("the validator rejects the whole list when one bot is invalid", () => {
  for (const list of [
    [bot("a"), { id: "bad id!", name: "x" }],
    [bot("a"), null],
    [bot("a"), bot("a")],
    [bot("a"), { ...bot("b"), name: "  " }],
    [bot("a"), bot("b", ["legacy-skill-id"])],
    [bot("a"), bot("b", [{ id: "", name: "x" }])],
    [bot("a"), { ...bot("b"), description: "x".repeat(20_001) }],
    [bot("a"), bot("b", [{ ...skill("s"), instructions: "x".repeat(20_001) }])],
  ]) {
    assert.deepEqual(validateBotsWrite(list), {
      ok: false,
      error: "invalid_bot",
    });
  }
  assert.deepEqual(validateBotsWrite([]), {
    ok: false,
    error: "invalid_body",
  });
  assert.deepEqual(validateBotsWrite("nope"), {
    ok: false,
    error: "invalid_body",
  });
});

test("the existing caps hold: 100 bots and 100 skills per bot", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => bot(`b${i}`));
  assert.ok(validateBotsWrite(many(100)).ok);
  assert.deepEqual(validateBotsWrite(many(101)), {
    ok: false,
    error: "too_many_bots",
  });
  const skills = (n: number) =>
    Array.from({ length: n }, (_, i) => skill(`s${i}`));
  assert.ok(validateBotsWrite([bot("a", skills(100))]).ok);
  assert.deepEqual(validateBotsWrite([bot("a", skills(101))]), {
    ok: false,
    error: "too_many_skills",
  });
});

test("selection is stored, left alone when omitted and cleared with null", () => {
  withDb((db) => {
    assert.deepEqual(readSelection(db), { activeBotId: null, mainBotId: null });
    writeSelection(db, { activeBotId: "a", mainBotId: "b" });
    writeSelection(db, { activeBotId: "c" });
    assert.deepEqual(readSelection(db), { activeBotId: "c", mainBotId: "b" });
    writeSelection(db, { mainBotId: null });
    assert.deepEqual(readSelection(db), { activeBotId: "c", mainBotId: null });
  });
});

test("rows with broken JSON, invalid bots or duplicate ids are skipped", () => {
  withDb((db) => {
    replaceBots(db, valid([bot("a"), bot("b")]));
    const insert = db.prepare(
      "INSERT INTO bots (id, position, data, updated_at) VALUES (?, ?, ?, 0)",
    );
    insert.run("broken", 2, "{not json");
    insert.run("nameless", 3, JSON.stringify({ id: "nameless" }));
    insert.run("copy", 4, JSON.stringify(bot("a")));
    insert.run("c", 5, JSON.stringify(bot("c")));
    assert.deepEqual(
      listBots(db).map((b) => b.id),
      ["a", "b", "c"],
    );
  });
});
