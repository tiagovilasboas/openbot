import assert from "node:assert/strict";
import test from "node:test";
import type { WriteResult } from "../../conversations/sync/conversations-sync-types.ts";
import type { UsageRecord } from "../usage-record.ts";
import { createUsagePutQueue } from "./usage-put-queue.ts";

const rec = (calls: number): UsageRecord => ({
  botId: "a",
  day: "2026-01-02",
  inputTokens: 1,
  outputTokens: 1,
  calls,
  callsWithoutUsage: 0,
});

const refused: WriteResult = {
  ok: false,
  failure: { kind: "http", status: 413, error: "payload_too_large" },
};

function setup(result: () => WriteResult = () => ({ ok: true })) {
  const sent: (readonly UsageRecord[])[] = [];
  const results: WriteResult[] = [];
  const queue = createUsagePutQueue({
    delayMs: 5,
    send: async (records) => {
      sent.push(records);
      return result();
    },
    onResult: (r) => {
      results.push(r);
    },
  });
  return { queue, sent, results };
}

const settle = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

test("rapid saves collapse into one request with the latest", async () => {
  const { queue, sent } = setup();
  queue.put([rec(1)]);
  queue.put([rec(2)]);
  queue.put([rec(3)]);
  await settle();
  assert.deepEqual(sent, [[rec(3)]]);
});

test("a save during a request is sent after it, and only the last is settled", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const sent: (readonly UsageRecord[])[] = [];
  const settled: boolean[] = [];
  const queue = createUsagePutQueue({
    delayMs: 1,
    send: async (records) => {
      sent.push(records);
      if (sent.length === 1) await gate;
      return { ok: true };
    },
    onResult: (_r, done) => settled.push(done),
  });
  queue.put([rec(1)]);
  await settle(10);
  queue.put([rec(2)]);
  release();
  await settle(30);
  assert.deepEqual(sent, [[rec(1)], [rec(2)]]);
  assert.deepEqual(settled, [false, true]);
});

test("a refused write is reported and not retried", async () => {
  const { queue, sent, results } = setup(() => refused);
  queue.put([rec(1)]);
  await settle(60);
  assert.equal(sent.length, 1);
  assert.deepEqual(results, [refused]);
});

test("a throwing send counts as a network failure", async () => {
  const results: WriteResult[] = [];
  const queue = createUsagePutQueue({
    delayMs: 1,
    send: async () => {
      throw new Error("boom");
    },
    onResult: (r) => results.push(r),
  });
  queue.put([rec(1)]);
  await settle();
  assert.deepEqual(results, [{ ok: false, failure: { kind: "network" } }]);
});

test("flush sends what waits right away", async () => {
  const { queue, sent } = setup();
  queue.put([rec(1)]);
  await queue.flush();
  assert.deepEqual(sent, [[rec(1)]]);
});
