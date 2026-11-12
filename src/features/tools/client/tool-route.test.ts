import assert from "node:assert/strict";
import test from "node:test";
import {
  STREAM_ROUTE,
  streamRouteFor,
  toolRequestFields,
  toolTurnFor,
  TOOLS_ROUTE,
} from "./tool-route.ts";

test("only a single bot that opted in takes the tool route", () => {
  const optedIn = { id: "b1", toolsEnabled: true };
  assert.deepEqual(toolTurnFor(optedIn, false), { botId: "b1" });
  assert.equal(toolTurnFor(optedIn, true), undefined);
  assert.equal(toolTurnFor({ id: "b1" }, false), undefined);
  assert.equal(
    toolTurnFor({ id: "b1", toolsEnabled: false }, false),
    undefined,
  );
});

test("the route follows the tool request", () => {
  assert.equal(streamRouteFor(undefined), STREAM_ROUTE);
  assert.equal(streamRouteFor({ botId: "b1" }), TOOLS_ROUTE);
});

test("the tool fields carry the bot, the opt-in and a resume", () => {
  assert.deepEqual(toolRequestFields(undefined), {});
  assert.deepEqual(toolRequestFields({ botId: "b1" }), {
    botId: "b1",
    toolsEnabled: true,
  });
  const resume = {
    turnId: "t",
    decisions: [
      { callId: "c1", decision: "deny" as const, argsDigest: "d".repeat(64) },
    ],
  };
  assert.deepEqual(toolRequestFields({ botId: "b1", resume }), {
    botId: "b1",
    toolsEnabled: true,
    resume,
  });
});
