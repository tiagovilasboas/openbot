import assert from "node:assert/strict";
import test from "node:test";
import { crewCopy } from "./crew-copy.ts";
import type { CrewStopRecord } from "./crew-stop-record.ts";

test("loop stop note exists in every language for every reason", () => {
  for (const lang of ["pt", "en", "es"] as const) {
    const reasons: CrewStopRecord[] = [
      { reason: "max_rounds", limit: 8 },
      { reason: "echo" },
      { reason: "ping_pong" },
    ];
    for (const reason of reasons) {
      assert.ok(crewCopy[lang].loopStopped(reason).length > 10);
    }
  }
  assert.match(
    crewCopy.en.loopStopped({ reason: "max_rounds", limit: 8 }),
    /8 rounds/,
  );
});
