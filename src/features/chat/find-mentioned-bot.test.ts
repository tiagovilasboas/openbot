import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { findMentionedBot } from "./find-mentioned-bot.ts";

const [first, second] = CREW_PRESETS;

test("an @name resolves to the matching visible bot", () => {
  const found = findMentionedBot(`hi @${second!.id}`, [first!, second!]);
  assert.equal(found?.id, second!.id);
});

test("an @name never resolves to a hidden bot", () => {
  const bots = [first!, { ...second!, hidden: true }];
  assert.equal(findMentionedBot(`hi @${second!.id}`, bots), null);
});
