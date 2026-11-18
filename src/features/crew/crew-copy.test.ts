import assert from "node:assert/strict";
import test from "node:test";
import { crewCopy } from "./crew-copy.ts";
import type { LoopStopReason } from "./loop-guard/index.ts";

test("loop stop note exists in every language for every reason", () => {
  for (const lang of ["pt", "en", "es"] as const) {
    const reasons: LoopStopReason[] = [
      { reason: "max_rounds", rounds: 8, limit: 8 },
      { reason: "echo", botId: "a", repeatedBotId: "b" },
      { reason: "ping_pong", botIds: ["a", "b"] },
    ];
    for (const reason of reasons) {
      assert.ok(crewCopy[lang].loopStopped(reason).length > 10);
    }
  }
  assert.match(
    crewCopy.en.loopStopped({ reason: "max_rounds", rounds: 8, limit: 8 }),
    /8 rounds/,
  );
});
