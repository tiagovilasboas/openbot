import assert from "node:assert/strict";
import test from "node:test";

import { workingBotIds } from "./working-bots.ts";

test("nobody works while no turn is in flight", () => {
  assert.deepEqual(workingBotIds(false, "chief", undefined), []);
  assert.deepEqual(workingBotIds(false, "chief", "dev"), []);
  assert.deepEqual(workingBotIds(true, null, undefined), []);
});

test("the bot that took the message works during its turn", () => {
  assert.deepEqual(workingBotIds(true, "chief", undefined), ["chief"]);
});

test("a delegated specialist works beside the Chief", () => {
  assert.deepEqual(workingBotIds(true, "chief", "dev"), ["chief", "dev"]);
  assert.deepEqual(workingBotIds(true, "chief", "chief"), ["chief"]);
});
