import assert from "node:assert/strict";
import test from "node:test";
import {
  createSendReplay,
  fingerprintBody,
  type SendOutcome,
} from "./send-replay.ts";

const ok = (text: string): SendOutcome => ({ status: 200, body: { text } });

function setup(options: { ttlMs?: number; maxEntries?: number } = {}) {
  const clock = { t: 1_000 };
  const replay = createSendReplay({ ...options, now: () => clock.t });
  let calls = 0;
  const compute = (outcome: SendOutcome) => async () => {
    calls += 1;
    return outcome;
  };
  return { clock, replay, compute, calls: () => calls };
}

test("the fingerprint is a stable hash, not the body", () => {
  const a = fingerprintBody({ text: "secret-body" });
  assert.equal(a, fingerprintBody({ text: "secret-body" }));
  assert.notEqual(a, fingerprintBody({ text: "other" }));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes("secret"));
});

test("a miss runs the model and a second identical send replays it", async () => {
  const s = setup();
  const first = await s.replay.run("key-00001", "f1", s.compute(ok("a")));
  const second = await s.replay.run("key-00001", "f1", s.compute(ok("b")));
  assert.deepEqual(first, {
    kind: "outcome",
    outcome: ok("a"),
    replayed: false,
  });
  assert.deepEqual(second, {
    kind: "outcome",
    outcome: ok("a"),
    replayed: true,
  });
  assert.equal(s.calls(), 1);
});

test("the stored reply expires after the ttl", async () => {
  const s = setup({ ttlMs: 100 });
  await s.replay.run("key-00001", "f1", s.compute(ok("a")));
  s.clock.t += 99;
  await s.replay.run("key-00001", "f1", s.compute(ok("b")));
  assert.equal(s.calls(), 1);
  s.clock.t += 2;
  const after = await s.replay.run("key-00001", "f1", s.compute(ok("c")));
  assert.equal(s.calls(), 2);
  assert.deepEqual(after, {
    kind: "outcome",
    outcome: ok("c"),
    replayed: false,
  });
});

test("the oldest entries are evicted past the bound", async () => {
  const s = setup({ maxEntries: 2 });
  for (const key of ["key-00001", "key-00002", "key-00003"]) {
    await s.replay.run(key, "f", s.compute(ok(key)));
  }
  assert.ok(s.replay.size() <= 2);
  await s.replay.run("key-00001", "f", s.compute(ok("again")));
  assert.equal(s.calls(), 4);
});

test("the same key with another body is a conflict and runs nothing", async () => {
  const s = setup();
  await s.replay.run("key-00001", "f1", s.compute(ok("a")));
  const clash = await s.replay.run("key-00001", "f2", s.compute(ok("b")));
  assert.deepEqual(clash, { kind: "conflict" });
  assert.equal(s.calls(), 1);
});

test("a send that arrives while the first runs shares its result", async () => {
  const s = setup();
  let release!: (outcome: SendOutcome) => void;
  let calls = 0;
  const slow = () => {
    calls += 1;
    return new Promise<SendOutcome>((resolve) => (release = resolve));
  };
  const first = s.replay.run("key-00001", "f1", slow);
  const second = s.replay.run("key-00001", "f1", slow);
  const other = await s.replay.run("key-00001", "f2", slow);
  assert.deepEqual(other, { kind: "conflict" });
  release(ok("shared"));
  assert.deepEqual(await first, {
    kind: "outcome",
    outcome: ok("shared"),
    replayed: false,
  });
  assert.deepEqual(await second, {
    kind: "outcome",
    outcome: ok("shared"),
    replayed: true,
  });
  assert.equal(calls, 1);
});

test("failures are not cached, so the same key retries", async () => {
  const s = setup();
  const fail = { status: 502, body: { error: "upstream_error" } };
  await s.replay.run("key-00001", "f1", s.compute(fail));
  const retry = await s.replay.run("key-00001", "f1", s.compute(ok("fine")));
  assert.equal(s.calls(), 2);
  assert.deepEqual(retry, {
    kind: "outcome",
    outcome: ok("fine"),
    replayed: false,
  });
  assert.equal(s.replay.size(), 1);
});

test("a thrown compute leaves nothing behind", async () => {
  const s = setup();
  await assert.rejects(
    s.replay.run("key-00001", "f1", async () => {
      throw new Error("boom");
    }),
  );
  assert.equal(s.replay.size(), 0);
});
