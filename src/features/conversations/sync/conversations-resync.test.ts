import assert from "node:assert/strict";
import { test } from "node:test";
import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import { createResync } from "./conversations-resync.ts";
import type { ConversationsApi } from "./conversations-sync-types.ts";
import { syncConversationsOnLoad } from "./sync-conversations-on-load.ts";

function deferredLoad() {
  const releases: Array<() => void> = [];
  let calls = 0;
  return {
    load: () => {
      calls += 1;
      return new Promise<void>((resolve) => releases.push(resolve));
    },
    release: () => releases.shift()?.(),
    calls: () => calls,
  };
}

test("two triggers inside the throttle window cause one load", async () => {
  let t = 0;
  const d = deferredLoad();
  const resync = createResync({ load: d.load, now: () => t });
  const first = resync.first();
  d.release();
  await first;
  t = 10_000;
  assert.equal(resync.trigger(), false);
  t = 31_000;
  assert.equal(resync.trigger(), true);
  d.release();
  await new Promise((resolve) => setImmediate(resolve));
  t = 40_000;
  assert.equal(resync.trigger(), false);
  assert.equal(d.calls(), 2);
});

test("a trigger during an in-flight load does not start a second", async () => {
  let t = 0;
  const d = deferredLoad();
  const resync = createResync({ load: d.load, now: () => t });
  const first = resync.first();
  t = 100_000;
  assert.equal(resync.trigger(), false);
  assert.equal(resync.first(), first);
  assert.equal(d.calls(), 1);
  d.release();
  await first;
  assert.equal(resync.trigger(), true);
  assert.equal(d.calls(), 2);
});

const msg = (id: number) => ({ id }) as unknown as MessageData;

function harness(initialServer: MessageData[]) {
  let server = initialServer;
  let local: MessageData[] = [];
  let unsynced = false;
  const api = {
    get: async () => ({ ok: true, messages: server }),
    put: async () => ({ ok: true }),
    remove: async () => ({ ok: true }),
  } as unknown as ConversationsApi;
  const run = () =>
    syncConversationsOnLoad({
      api,
      botIds: () => ["b"],
      readLocal: () => local,
      isUnsynced: () => unsynced,
      setUnsynced: (_id, v) => {
        unsynced = v;
      },
      mirror: (_id, messages) => {
        local = messages;
      },
      reportFailure: () => undefined,
    });
  return {
    run,
    setServer: (m: MessageData[]) => {
      server = m;
    },
    setLocal: (m: MessageData[], u: boolean) => {
      local = m;
      unsynced = u;
    },
    local: () => local,
  };
}

test("a second load picks up a newer server copy", async () => {
  const h = harness([msg(1)]);
  await h.run();
  assert.equal(h.local().length, 1);
  h.setServer([msg(1), msg(2)]);
  await h.run();
  assert.equal(h.local().length, 2);
});

test("an unsynced local thread is not replaced on resync", async () => {
  const h = harness([msg(1)]);
  await h.run();
  h.setLocal([msg(1), msg(9)], true);
  h.setServer([msg(1), msg(2), msg(3)]);
  await h.run();
  assert.ok(h.local().some((m) => (m as { id: number }).id === 9));
});
