import assert from "node:assert/strict";
import test from "node:test";
import { deleteBotFromList } from "./bot-storage.ts";
import type { BotProfile } from "./bot-types.ts";
import { CREW_PRESETS } from "./crew-presets.ts";
import { mainBotFirst, resolveMainBotId } from "./main-bot.ts";

const bots = [{ id: "a" }, { id: "chief-of-staff" }, { id: "b" }];

test("the stored choice is the main bot while it exists", () => {
  assert.equal(resolveMainBotId("b", bots), "b");
});

test("without a valid choice the stock Chief leads, then the first bot", () => {
  assert.equal(resolveMainBotId(null, bots), "chief-of-staff");
  assert.equal(resolveMainBotId("gone", bots), "chief-of-staff");
  assert.equal(resolveMainBotId(null, [{ id: "x" }, { id: "y" }]), "x");
  assert.equal(resolveMainBotId(null, []), undefined);
});

test("the main bot always sits on top, the rest keep their order", () => {
  const ids = (list: { id: string }[]) => list.map((bot) => bot.id);
  assert.deepEqual(ids(mainBotFirst(bots, "b")), ["b", "a", "chief-of-staff"]);
  assert.equal(mainBotFirst(bots, "a"), bots);
  assert.equal(mainBotFirst(bots, "gone"), bots);
});

test("the main bot cannot be deleted, the others can", () => {
  const crew: BotProfile[] = [...CREW_PRESETS];
  const main = crew[1]?.id ?? "";
  const refused = deleteBotFromList(crew, main, main);
  assert.equal(refused.bots.length, crew.length);
  assert.equal(refused.newActiveId, undefined);

  const other = crew[0]?.id ?? "";
  const removed = deleteBotFromList(crew, other, main);
  assert.equal(removed.bots.length, crew.length - 1);
  assert.ok(!removed.bots.some((bot) => bot.id === other));
});
