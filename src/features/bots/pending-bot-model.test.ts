import assert from "node:assert/strict";
import { test } from "node:test";
import { pendingBotModel } from "./pending-bot-model.ts";

const bot = { id: "b1", modelId: "vendor/new" };

test("no turn in flight means nothing is pending", () => {
  assert.equal(pendingBotModel(bot, null), null);
});

test("a turn on another model leaves the saved one pending", () => {
  assert.deepEqual(
    pendingBotModel(bot, { botId: "b1", modelId: "vendor/old" }),
    { modelId: "vendor/new" },
  );
});

test("the same model, even with stray spaces, is not pending", () => {
  assert.equal(
    pendingBotModel(bot, { botId: "b1", modelId: " vendor/new " }),
    null,
  );
});

test("moving between the default and a custom model is pending", () => {
  assert.deepEqual(
    pendingBotModel({ id: "b1" }, { botId: "b1", modelId: "vendor/old" }),
    { modelId: undefined },
  );
  assert.deepEqual(
    pendingBotModel({ id: "b1", modelId: "x" }, { botId: "b1", modelId: "" }),
    { modelId: "x" },
  );
});

test("a turn of another bot never makes this bot pending", () => {
  assert.equal(
    pendingBotModel(bot, { botId: "b2", modelId: "vendor/old" }),
    null,
  );
});
