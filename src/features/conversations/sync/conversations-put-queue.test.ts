import assert from "node:assert/strict";
import test from "node:test";
import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import { createConversationsPutQueue } from "./conversations-put-queue.ts";
import type { ThreadOp, WriteResult } from "./conversations-sync-types.ts";

const msg = (id: number): MessageData => ({
  id,
  language: "en",
  role: "user",
  text: `m${id}`,
});

const ok: WriteResult = { ok: true };
const refused: WriteResult = {
  ok: false,
  failure: { kind: "http", status: 413, error: "payload_too_large" },
};

function setup(result: () => WriteResult = () => ok) {
  const sent: { botId: string; op: ThreadOp }[] = [];
  const settled: boolean[] = [];
  const results: WriteResult[] = [];
  const queue = createConversationsPutQueue({
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
  queue.put("a", [msg(1)]);
  queue.put("a", [msg(1), msg(2)]);
  queue.put("a", [msg(1), msg(2), msg(3)]);
  await settle();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0]!.op, {
    kind: "put",
    messages: [msg(1), msg(2), msg(3)],
  });
  assert.deepEqual(settled, [true]);
});

test("different bots are sent separately", async () => {
  const { queue, sent } = setup();
  queue.put("a", [msg(1)]);
  queue.put("b", [msg(2)]);
  await settle();
  assert.deepEqual(sent.map((s) => s.botId).sort(), ["a", "b"]);
});

test("a save during a request is sent after it, never in parallel", async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const sent: ThreadOp[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const queue = createConversationsPutQueue({
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
  queue.put("a", [msg(1)]);
  await settle(20);
  queue.put("a", [msg(1), msg(2)]);
  await settle(20);
  assert.equal(sent.length, 1);
  release();
  await settle(30);
  assert.equal(sent.length, 2);
  assert.equal(maxInFlight, 1);
});

test("remove cancels a waiting save and sends a delete right away", async () => {
  const { queue, sent } = setup();
  queue.put("a", [msg(1)]);
  queue.remove("a");
  await settle();
  assert.deepEqual(
    sent.map((s) => s.op.kind),
    ["delete"],
  );
});

test("a refused write is reported once and not retried", async () => {
  const { queue, sent, settled, results } = setup(() => refused);
  queue.put("a", [msg(1)]);
  await settle(80);
  assert.equal(sent.length, 1);
  assert.deepEqual(results, [refused]);
  assert.deepEqual(settled, [true]);
});

test("a thrown send counts as a network failure", async () => {
  const results: WriteResult[] = [];
  const queue = createConversationsPutQueue({
    delayMs: 1,
    send: async () => {
      throw new Error("boom");
    },
    onResult: (_id, r) => results.push(r),
  });
  queue.put("a", [msg(1)]);
  await settle(20);
  assert.deepEqual(results, [{ ok: false, failure: { kind: "network" } }]);
});

test("flush sends what waits without the delay", async () => {
  const sent: ThreadOp[] = [];
  const queue = createConversationsPutQueue({
    delayMs: 10_000,
    send: async (_id, op) => {
      sent.push(op);
      return ok;
    },
  });
  queue.put("a", [msg(1)]);
  queue.put("b", [msg(2)]);
  await queue.flush();
  assert.equal(sent.length, 2);
});
