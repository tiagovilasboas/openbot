import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeBotProfile } from "./bot-storage.ts";
import {
  cleanFolder,
  groupByFolder,
  setBotFolder,
  sidebarOrder,
} from "./bot-folders.ts";
import { DEFAULT_BOT, type BotProfile } from "./bot-types.ts";

const bot = (id: string, extra: Partial<BotProfile> = {}): BotProfile => ({
  ...DEFAULT_BOT,
  id,
  name: id,
  ...extra,
});

const crew = [
  bot("chief", { folder: "Work" }),
  bot("a", { folder: "Work" }),
  bot("b"),
  bot("c", { folder: "Home" }),
  bot("d", { folder: "Work", hidden: true }),
  bot("e", { folder: "  Work  " }),
];

test("folders group visible bots; the main bot stays loose on top", () => {
  const groups = groupByFolder(crew, "chief");
  assert.deepEqual(
    groups.loose.map((b) => b.id),
    ["chief", "b"],
  );
  assert.deepEqual(
    groups.folders.map((f) => [f.name, f.bots.map((b) => b.id)]),
    [
      ["Home", ["c"]],
      ["Work", ["a", "e"]],
    ],
  );
  assert.deepEqual(
    sidebarOrder(crew, "chief").map((b) => b.id),
    ["chief", "b", "c", "a", "e"],
  );
});

test("a folder name is one trimmed line, capped, or nothing", () => {
  assert.equal(cleanFolder("  My\n  team "), "My team");
  assert.equal(cleanFolder("   "), undefined);
  assert.equal(cleanFolder(3), undefined);
  assert.equal(cleanFolder("x".repeat(50))?.length, 30);
});

test("moving into and out of a folder", () => {
  const moved = setBotFolder([bot("a")], "a", " Ops ");
  assert.equal(moved[0].folder, "Ops");
  const out = setBotFolder(moved, "a", "");
  assert.equal("folder" in out[0], false);
});

test("a stored folder survives the sanitizer", () => {
  const saved = sanitizeBotProfile({ ...bot("bot_1"), folder: " Ops " });
  assert.equal(saved?.folder, "Ops");
  const none = sanitizeBotProfile({ ...bot("bot_1"), folder: 7 });
  assert.equal(none && "folder" in none, false);
});
