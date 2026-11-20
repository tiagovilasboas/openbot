import assert from "node:assert/strict";
import test from "node:test";
import { chainedPrompt, followersOf, makesCycle } from "./routine-chain.ts";
import { checkRoutineInput } from "./routine-input.ts";

const r = (id: string, after?: string, botId = "bot", enabled = true) => ({
  id,
  botId,
  enabled,
  ...(after ? { afterRoutineId: after } : {}),
});

test("followers are enabled routines of the same bot linked after it", () => {
  const all = [
    r("a"),
    r("b", "a"),
    r("c", "a", "other"),
    r("d", "a", "bot", false),
    r("e", "b"),
  ];
  assert.deepEqual(
    followersOf(all[0], all).map((x) => x.id),
    ["b"],
  );
});

test("a link that leads back to the routine is a cycle", () => {
  const all = [r("a", "c"), r("b", "a"), r("c", "b")];
  assert.equal(makesCycle("a", "c", all), true);
  assert.equal(makesCycle("d", "c", all), false);
  assert.equal(makesCycle("a", "a", []), true);
});

test("the previous result goes after the prompt", () => {
  assert.equal(chainedPrompt("Do it", undefined, "en"), "Do it");
  assert.equal(
    chainedPrompt("Do it", "<x>", "en"),
    "Do it\n\nResult of the previous routine:\n<x>",
  );
});

test("routine input accepts a chain to another routine only", () => {
  const base = {
    id: "r1",
    botId: "bot",
    title: "T",
    prompt: "P",
    schedule: { kind: "interval", everyMinutes: 60 },
  };
  const ok = checkRoutineInput({ ...base, afterRoutineId: "r0" });
  assert.ok(ok.ok && ok.routine.afterRoutineId === "r0");
  assert.deepEqual(checkRoutineInput({ ...base, afterRoutineId: "r1" }), {
    ok: false,
    problem: "invalid_chain",
  });
  assert.deepEqual(checkRoutineInput({ ...base, afterRoutineId: "../x" }), {
    ok: false,
    problem: "invalid_chain",
  });
  const none = checkRoutineInput({ ...base, afterRoutineId: "" });
  assert.ok(none.ok && !("afterRoutineId" in none.routine));
});
