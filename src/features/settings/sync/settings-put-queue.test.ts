import assert from "node:assert/strict";
import test from "node:test";
import type { SettingKey, SettingsPatch } from "../settings-types.ts";
import { createSettingsPutQueue } from "./settings-put-queue.ts";
import type { WriteResult } from "./settings-sync-types.ts";

const ok: WriteResult = { ok: true };
const settle = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

function setup(result: () => WriteResult = () => ok) {
  const sent: SettingsPatch[] = [];
  const settled: SettingKey[][] = [];
  const queue = createSettingsPutQueue({
    delayMs: 5,
    send: async (patch) => {
      sent.push(patch);
      return result();
    },
    onResult: (_result, _sent, done) => void settled.push(done),
  });
  return { queue, sent, settled };
}

test("rapid changes collapse into one request, the latest value per key", async () => {
  const { queue, sent } = setup();
  queue.put({ language: "en" });
  queue.put({ memoryEnabled: false });
  queue.put({ language: "es" });
  await settle();
  assert.deepEqual(sent, [{ language: "es", memoryEnabled: false }]);
});

test("a null clear travels in the patch", async () => {
  const { queue, sent } = setup();
  queue.put({ modelConfig: null });
  await settle();
  assert.deepEqual(sent, [{ modelConfig: null }]);
});

test("a change made while a request is out is sent after it", async () => {
  const sent: SettingsPatch[] = [];
  const settled: SettingKey[][] = [];
  const queue = createSettingsPutQueue({
    delayMs: 5,
    send: async (patch) => {
      sent.push(patch);
      await settle(20);
      return ok;
    },
    onResult: (_r, _s, done) => void settled.push(done),
  });
  queue.put({ language: "en" });
  await settle(15); // the first request is now in flight
  queue.put({ language: "es", memoryEnabled: true });
  await settle(80);
  assert.deepEqual(sent, [
    { language: "en" },
    { language: "es", memoryEnabled: true },
  ]);
  // The key that a newer change waits on is not reported as settled.
  assert.deepEqual(settled[0], []);
  assert.deepEqual(settled[1], ["language", "memoryEnabled"]);
});

test("a failed send is reported once and never retried alone", async () => {
  const results: WriteResult[] = [];
  let calls = 0;
  const queue = createSettingsPutQueue({
    delayMs: 5,
    send: async () => {
      calls += 1;
      return { ok: false, failure: { kind: "http", status: 400 } };
    },
    onResult: (result) => void results.push(result),
  });
  queue.put({ language: "en" });
  await settle(60);
  assert.equal(calls, 1);
  assert.equal(results[0]?.ok, false);
});

test("a send that throws counts as a network failure", async () => {
  const results: WriteResult[] = [];
  const queue = createSettingsPutQueue({
    delayMs: 5,
    send: async () => {
      throw new Error("boom");
    },
    onResult: (result) => void results.push(result),
  });
  queue.put({ language: "en" });
  await settle();
  assert.deepEqual(results, [{ ok: false, failure: { kind: "network" } }]);
});

test("flush sends what is waiting without the delay", async () => {
  const { queue, sent } = setup();
  queue.put({ language: "en" });
  await queue.flush();
  assert.deepEqual(sent, [{ language: "en" }]);
});
