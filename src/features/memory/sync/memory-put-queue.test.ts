import assert from "node:assert/strict";
import test from "node:test";
import type { WriteResult } from "../../conversations/sync/conversations-sync-types.ts";
import type { MemoryEntry } from "../memory-entries.ts";
import { createMemoryPutQueue } from "./memory-put-queue.ts";
import type { NotesOp } from "./memory-sync-types.ts";

const note = (n: number): MemoryEntry => ({
  id: `mem_${n}`,
  text: `note ${n}`,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const ok: WriteResult = { ok: true };
const refused: WriteResult = {
  ok: false,
  failure: { kind: "http", status: 413, error: "payload_too_large" },
};

function setup(result: () => WriteResult = () => ok) {
  const sent: { botId: string; op: NotesOp }[] = [];
  const settled: boolean[] = [];
  const results: WriteResult[] = [];
  const queue = createMemoryPutQueue({
    delayMs: 5,
    send: async (botId, op) => {
      sent.push({ botId, op });
      return result();
    },
    onResult: (_id, r, done) => {
      results.push(r);
      settled.push(done);
    },
  });
  return { queue, sent, settled, results };
}

const settle = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

test("rapid saves of one bot collapse into one request with the latest", async () => {
  const { queue, sent, settled } = setup();
  queue.put("a", [note(1)]);
  queue.put("a", [note(1), note(2)]);
  queue.put("a", [note(1), note(2), note(3)]);
  await settle();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0]!.op, {
    kind: "put",
    entries: [note(1), note(2), note(3)],
  });
  assert.deepEqual(settled, [true]);
});

test("different bots are sent separately", async () => {
  const { queue, sent } = setup();
  queue.put("a", [note(1)]);
  queue.put("b", [note(2)]);
  await settle();
  assert.deepEqual(sent.map((s) => s.botId).sort(), ["a", "b"]);
});

test("a save during a request is sent after it, never in parallel", async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const sent: NotesOp[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const queue = createMemoryPutQueue({
    delayMs: 1,
    send: async (_id, op) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      sent.push(op);
      if (sent.length === 1) await gate;
      inFlight -= 1;
      return ok;
    },
  });
  queue.put("a", [note(1)]);
  await settle(20);
  queue.put("a", [note(1), note(2)]);
  await settle(20);
  assert.equal(sent.length, 1);
  release();
  await settle(30);
  assert.equal(sent.length, 2);
  assert.equal(maxInFlight, 1);
});

test("remove cancels a waiting save and sends a delete right away", async () => {
  const { queue, sent } = setup();
  queue.put("a", [note(1)]);
  queue.remove("a");
  await settle();
  assert.deepEqual(
    sent.map((s) => s.op.kind),
    ["delete"],
  );
});

test("a refused write is reported once and not retried", async () => {
  const { queue, sent, settled, results } = setup(() => refused);
  queue.put("a", [note(1)]);
  await settle(80);
  assert.equal(sent.length, 1);
  assert.deepEqual(results, [refused]);
  assert.deepEqual(settled, [true]);
});

test("a thrown send counts as a network failure", async () => {
  const results: WriteResult[] = [];
  const queue = createMemoryPutQueue({
    delayMs: 1,
    send: async () => {
      throw new Error("boom");
    },
    onResult: (_id, r) => results.push(r),
  });
  queue.put("a", [note(1)]);
  await settle(20);
  assert.deepEqual(results, [{ ok: false, failure: { kind: "network" } }]);
});

test("flush sends what waits without the delay", async () => {
  const sent: NotesOp[] = [];
  const queue = createMemoryPutQueue({
    delayMs: 10_000,
    send: async (_id, op) => {
      sent.push(op);
      return ok;
    },
  });
  queue.put("a", [note(1)]);
  queue.put("b", [note(2)]);
  await queue.flush();
  assert.equal(sent.length, 2);
});
