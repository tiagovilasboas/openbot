import assert from "node:assert/strict";
import test from "node:test";
import { describeOpenRouterAccess } from "./openrouter-access.ts";

test("a saved router key means connected, none means connect", () => {
  assert.equal(describeOpenRouterAccess(true), "connected");
  assert.equal(describeOpenRouterAccess(false), "connect");
});
