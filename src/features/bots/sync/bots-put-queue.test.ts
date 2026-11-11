import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../crew-presets.ts";
import { createBotsPutQueue } from "./bots-put-queue.ts";
import type { ApiResult, BotsPayload } from "./bots-sync-types.ts";

const [a, b, c] = CREW_PRESETS;

const payload = (
  bots: BotsPayload["bots"],
  mainBotId: string,
  activeBotId = mainBotId,
): BotsPayload => ({ bots, mainBotId, activeBotId });

function harness(responder?: (p: BotsPayload) => ApiResult) {
  const sent: BotsPayload[] = [];
  const results: ApiResult[] = [];
  const drained: boolean[] = [];
  const queue = createBotsPutQueue({
    delayMs: 5,
    send: async (p) => {
      sent.push(p);
      await Promise.resolve();
      return (
        responder?.(p) ?? {
          ok: true,
          state: {
            bots: p.bots,
            activeBotId: p.activeBotId,
            mainBotId: p.mainBotId,
          },
        }
      );
    },
    onResult: (r) => results.push(r),
    onDrained: (ok) => drained.push(ok),
  });
  queue.noteServerMain(a!.id);
  return { queue, sent, results, drained };
}

test("rapid edits collapse into one request with the last state", async () => {
  const { queue, sent } = harness();
  queue.enqueue(payload([a!], a!.id));
  queue.enqueue(payload([a!, b!], a!.id));
  queue.enqueue(payload([a!, b!, c!], a!.id));
  await queue.flush();
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.bots.length, 3);
});

test("the debounce sends on its own without a flush", async () => {
  const { queue, sent, drained } = harness();
  queue.enqueue(payload([a!], a!.id));
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(sent.length, 1);
  assert.deepEqual(drained, [true]);
  void queue;
});

test("edits made while a request is in flight go next, in order", async () => {
  const { queue, sent } = harness();
  queue.enqueue(payload([a!], a!.id));
  const first = queue.flush();
  queue.enqueue(payload([a!, b!], a!.id));
  queue.enqueue(payload([a!, b!, c!], a!.id));
  await first;
  await queue.flush();
  assert.deepEqual(
    sent.map((p) => p.bots.length),
    [1, 3],
  );
});

test("making another bot main then deleting the old main is two requests in order", async () => {
  const { queue, sent } = harness();
  queue.enqueue(payload([a!, b!], b!.id));
  queue.enqueue(payload([b!], b!.id));
  await queue.flush();
  assert.equal(sent.length, 2);
  assert.deepEqual(
    sent.map((p) => p.bots.map((bot) => bot.id)),
    [[a!.id, b!.id], [b!.id]],
  );
});

test("after the main moved, later edits coalesce again", async () => {
  const { queue, sent } = harness();
  queue.enqueue(payload([a!, b!], b!.id));
  queue.enqueue(payload([b!], b!.id));
  queue.enqueue(payload([b!, c!], b!.id));
  await queue.flush();
  assert.equal(sent.length, 2);
  assert.equal(sent[1]!.bots.length, 2);
});

test("a refused request is reported and does not stop the next one", async () => {
  let call = 0;
  const { queue, sent, results, drained } = harness((p) => {
    call += 1;
    return call === 1
      ? {
          ok: false,
          failure: { kind: "http", status: 400, error: "invalid_bot" },
        }
      : {
          ok: true,
          state: { bots: p.bots, activeBotId: null, mainBotId: p.mainBotId },
        };
  });
  queue.enqueue(payload([a!, b!], b!.id));
  queue.enqueue(payload([b!], b!.id));
  await queue.flush();
  assert.equal(sent.length, 2);
  assert.deepEqual(
    results.map((r) => r.ok),
    [false, true],
  );
  assert.deepEqual(drained, [false]);
});

test("flushing an empty queue reports nothing", async () => {
  const { queue, drained } = harness();
  await queue.flush();
  assert.deepEqual(drained, []);
});
