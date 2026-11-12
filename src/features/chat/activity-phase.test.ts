import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activityPhase, elapsedSeconds } from "./activity-phase.ts";

describe("activityPhase", () => {
  it("is thinking until the first token", () => {
    assert.equal(
      activityPhase({ delegating: false, hasStreamedText: false }),
      "thinking",
    );
  });

  it("is writing once text streams", () => {
    assert.equal(
      activityPhase({ delegating: false, hasStreamedText: true }),
      "writing",
    );
  });

  it("is consulting while a crew member works, even with text on screen", () => {
    assert.equal(
      activityPhase({ delegating: true, hasStreamedText: false }),
      "consulting",
    );
    assert.equal(
      activityPhase({ delegating: true, hasStreamedText: true }),
      "consulting",
    );
  });
});

describe("elapsedSeconds", () => {
  it("counts whole seconds", () => {
    assert.equal(elapsedSeconds(1000, 1999), 0);
    assert.equal(elapsedSeconds(1000, 13_000), 12);
  });

  it("never goes negative", () => {
    assert.equal(elapsedSeconds(5000, 1000), 0);
  });
});
