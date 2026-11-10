import assert from "node:assert/strict";
import test from "node:test";
import {
  createStreamSlots,
  DEFAULT_STREAMS_GLOBAL,
  DEFAULT_STREAMS_PER_CLIENT,
  streamSlotsFromEnv,
} from "./stream-slots.ts";

test("a client gets its quota of slots, then null until one is released", () => {
  const slots = createStreamSlots({ perClient: 2, global: 10 });
  const first = slots.acquire("a");
  const second = slots.acquire("a");
  assert.ok(first && second);
  assert.equal(slots.acquire("a"), null);
  assert.ok(slots.acquire("b"), "another client is unaffected");
  first();
  assert.ok(slots.acquire("a"), "a freed slot can be taken again");
});

test("the global cap holds across clients", () => {
  const slots = createStreamSlots({ perClient: 5, global: 3 });
  assert.ok(slots.acquire("a"));
  assert.ok(slots.acquire("b"));
  assert.ok(slots.acquire("c"));
  assert.equal(slots.acquire("d"), null);
  assert.equal(slots.open(), 3);
});

test("releasing twice returns only one slot", () => {
  const slots = createStreamSlots({ perClient: 1, global: 2 });
  const release = slots.acquire("a");
  assert.ok(release);
  release();
  release();
  assert.equal(slots.open(), 0);
  assert.ok(slots.acquire("a"));
  assert.equal(
    slots.acquire("a"),
    null,
    "the double release gave nothing back",
  );
});

test("limits come from the env, and invalid values use the defaults", () => {
  const defaults = streamSlotsFromEnv({});
  const taken = Array.from({ length: DEFAULT_STREAMS_PER_CLIENT }, () =>
    defaults.acquire("a"),
  );
  assert.ok(taken.every(Boolean));
  assert.equal(defaults.acquire("a"), null);
  assert.equal(DEFAULT_STREAMS_PER_CLIENT, 4);
  assert.equal(DEFAULT_STREAMS_GLOBAL, 20);

  for (const bad of ["0", "-1", "abc", "1.5", ""]) {
    const slots = streamSlotsFromEnv({ OPENBOT_STREAMS_PER_CLIENT: bad });
    for (let i = 0; i < DEFAULT_STREAMS_PER_CLIENT; i++) {
      assert.ok(slots.acquire("a"), `value ${JSON.stringify(bad)}`);
    }
    assert.equal(slots.acquire("a"), null);
  }

  const custom = streamSlotsFromEnv({
    OPENBOT_STREAMS_PER_CLIENT: "1",
    OPENBOT_STREAMS_GLOBAL: "2",
  });
  assert.ok(custom.acquire("a"));
  assert.equal(custom.acquire("a"), null);
  assert.ok(custom.acquire("b"));
  assert.equal(custom.acquire("c"), null);
});
