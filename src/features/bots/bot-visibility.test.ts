import assert from "node:assert/strict";
import test from "node:test";
import { parseBots, sanitizeBotProfile } from "./bot-storage.ts";
import type { BotProfile } from "./bot-types.ts";
import {
  canHideBot,
  hiddenBots,
  setBotHidden,
  visibleBots,
} from "./bot-visibility.ts";

function bot(id: string, hidden = false): BotProfile {
  return {
    id,
    name: id,
    description: "d",
    avatarShape: "circle",
    avatarColor: "cyan",
    skills: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...(hidden ? { hidden: true } : {}),
  };
}

test("visibility splits the list into shown and hidden bots", () => {
  const list = [bot("a"), bot("b", true), bot("c")];
  assert.deepEqual(
    visibleBots(list).map((b) => b.id),
    ["a", "c"],
  );
  assert.deepEqual(
    hiddenBots(list).map((b) => b.id),
    ["b"],
  );
});

test("the main bot and the last visible bot cannot be hidden", () => {
  const list = [bot("main"), bot("a"), bot("b", true)];
  assert.equal(canHideBot(list, "main", "main"), false);
  assert.equal(canHideBot(list, "a", "main"), true);
  assert.equal(canHideBot(list, "b", "main"), false, "already hidden");
  assert.equal(canHideBot(list, "nope", "main"), false);
  assert.equal(canHideBot([bot("a"), bot("b", true)], "a"), false);
});

test("setBotHidden hides and restores without touching the others", () => {
  const list = [bot("a"), bot("b")];
  const hidden = setBotHidden(list, "b", true);
  assert.equal(hidden[1]?.hidden, true);
  assert.equal(hidden[0], list[0]);
  const restored = setBotHidden(hidden, "b", false);
  assert.equal("hidden" in restored[1]!, false);
});

test("hidden survives sanitizing and old bots without it still parse", () => {
  assert.equal(sanitizeBotProfile(bot("a", true))?.hidden, true);
  const old = sanitizeBotProfile({ ...bot("a"), hidden: "yes" });
  assert.ok(old);
  assert.equal("hidden" in old, false);
  const stored = JSON.stringify([bot("a"), bot("b", true)]);
  assert.deepEqual(
    parseBots(stored).map((b) => b.hidden === true),
    [false, true],
  );
});
