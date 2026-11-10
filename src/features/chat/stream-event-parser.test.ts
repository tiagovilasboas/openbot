import assert from "node:assert/strict";
import test from "node:test";
import { parseStreamEvent } from "./stream-event-parser.ts";

test("reads each event type", () => {
  assert.deepEqual(parseStreamEvent('{"type":"delta","text":"oi"}'), {
    type: "delta",
    text: "oi",
  });
  assert.deepEqual(parseStreamEvent('{"type":"start","provider":"p"}'), {
    type: "start",
    provider: "p",
  });
  assert.deepEqual(
    parseStreamEvent(
      '{"type":"done","provider":"p","failover":{"fromModel":"a","toModel":"b","reason":"r"}}',
    ),
    {
      type: "done",
      provider: "p",
      failover: { fromModel: "a", toModel: "b", reason: "r" },
    },
  );
  assert.deepEqual(
    parseStreamEvent('{"type":"error","code":"rate_limit","status":429}'),
    { type: "error", code: "rate_limit", provider: null, status: 429 },
  );
});

test("drops lines that are not a known event", () => {
  for (const line of [
    "",
    "not json",
    "[1]",
    '{"type":"delta"}',
    '{"type":"delta","text":5}',
    '{"type":"mystery"}',
  ]) {
    assert.equal(parseStreamEvent(line), null, line);
  }
});

test("an unknown error code becomes unknown and an odd failover is ignored", () => {
  assert.deepEqual(parseStreamEvent('{"type":"error","code":"boom"}'), {
    type: "error",
    code: "unknown",
    provider: null,
  });
  assert.deepEqual(
    parseStreamEvent(
      '{"type":"done","provider":"p","failover":{"fromModel":1}}',
    ),
    { type: "done", provider: "p" },
  );
});
