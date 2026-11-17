import assert from "node:assert/strict";
import test from "node:test";
import {
  routerSse,
  streamResponse,
} from "../../shared/testing/stream-fixtures.ts";
import { createStreamSlots } from "../server-guard/stream-slots.ts";
import type { FetchLike } from "./model-adapter.ts";
import { handleChatStream } from "./stream-chat-handler.ts";
import {
  createStreamReplay,
  type StreamReplayOptions,
} from "./stream-replay.ts";

const KEY = "send-0001";

function chatRequest(text = "hi", key: string | null = KEY): Request {
  return new Request("http://localhost/api/chat/stream", {
    method: "POST",
    headers: key ? { "idempotency-key": key } : {},
    body: JSON.stringify({
      language: "en",
      messages: [{ role: "user", text }],
      config: {
        provider: "router",
        baseUrl: "https://93.184.216.34/v1",
        model: "vendor/model",
      },
    }),
  });
}

function setup(options: StreamReplayOptions = {}) {
  const clock = { t: 1_000 };
  const replay = createStreamReplay({ ...options, now: () => clock.t });
  const slots = createStreamSlots({ perClient: 10, global: 10 });
  let calls = 0;
  let upstream: () => Response = () => streamResponse(routerSse(["hello"]));
  const fetchImpl: FetchLike = async () => {
    calls += 1;
    return upstream();
  };
  const send = (text?: string, key?: string | null) =>
    handleChatStream(chatRequest(text, key), {
      env: {},
      fetchImpl,
      slots,
      replay,
    });
  return {
    clock,
    replay,
    slots,
    send,
    calls: () => calls,
    setUpstream: (next: () => Response) => {
      upstream = next;
    },
  };
}

test("a repeated send replays the stored lines without a second model call", async () => {
  const s = setup();
  const first = await (await s.send()).text();
  const second = await s.send();
  assert.equal(second.status, 200);
  assert.match(
    second.headers.get("content-type") ?? "",
    /^application\/x-ndjson/,
  );
  assert.equal(await second.text(), first);
  assert.match(first, /"type":"done"/);
  assert.equal(s.calls(), 1);
  assert.equal(s.slots.open(), 0, "a replay takes no slot");
});

test("the same key with another request is a 409 conflict", async () => {
  const s = setup();
  await (await s.send("one")).text();
  const response = await s.send("two");
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "idempotency_conflict" });
  assert.equal(s.calls(), 1);
});

test("a repeat while the first stream runs shares its lines, one model call", async () => {
  const s = setup();
  const first = await s.send();
  const second = await s.send();
  const [a, b] = await Promise.all([first.text(), second.text()]);
  assert.equal(s.calls(), 1);
  assert.equal(a, b);
  assert.match(b, /"type":"done"/);
  const third = await s.send();
  assert.equal(await third.text(), a);
  assert.equal(s.calls(), 1);
});

test("a failed stream is never stored", async () => {
  const s = setup();
  s.setUpstream(() =>
    streamResponse(routerSse(["part"]).slice(0, 1), { reset: true }),
  );
  const failed = await (await s.send()).text();
  assert.match(failed, /"type":"error"/);
  assert.equal(s.replay.size(), 0);
  s.setUpstream(() => streamResponse(routerSse(["ok"])));
  const retry = await (await s.send()).text();
  assert.match(retry, /"type":"done"/);
  assert.equal(s.calls(), 2);
});

test("a plain error status is passed through and not stored", async () => {
  const s = setup();
  const noProvider = await handleChatStream(
    new Request("http://localhost/api/chat/stream", {
      method: "POST",
      headers: { "idempotency-key": "send-0002" },
      body: JSON.stringify({
        language: "en",
        messages: [{ role: "user", text: "x" }],
      }),
    }),
    { env: {}, slots: s.slots, replay: s.replay },
  );
  assert.equal(noProvider.status, 503);
  assert.equal(s.replay.size(), 0);
});

test("a cancelled stream is never stored", async () => {
  const s = setup();
  s.setUpstream(() =>
    streamResponse(routerSse(["a"]).slice(0, 1), { hang: true }),
  );
  const response = await s.send();
  const reader = response.body!.getReader();
  await reader.read();
  await reader.cancel();
  assert.equal(s.replay.size(), 0);
  assert.equal(s.slots.open(), 0);
  s.setUpstream(() => streamResponse(routerSse(["ok"])));
  await (await s.send()).text();
  assert.equal(s.calls(), 2);
});

test("without a key every send calls the model", async () => {
  const s = setup();
  await (await s.send("hi", null)).text();
  await (await s.send("hi", null)).text();
  assert.equal(s.calls(), 2);
  assert.equal(s.replay.size(), 0);
});

test("a stored stream expires after the TTL", async () => {
  const s = setup({ ttlMs: 5_000 });
  await (await s.send()).text();
  s.clock.t += 4_999;
  await (await s.send()).text();
  assert.equal(s.calls(), 1);
  s.clock.t += 5_001;
  await (await s.send()).text();
  assert.equal(s.calls(), 2);
});

test("a stream above the byte cap is not stored", async () => {
  const s = setup({ maxEntryBytes: 20 });
  const first = await (await s.send()).text();
  assert.match(first, /"type":"done"/, "the first caller still gets it all");
  assert.equal(s.replay.size(), 0);
  await (await s.send()).text();
  assert.equal(s.calls(), 2);
});

test("the oldest stored streams go first when the table is full", async () => {
  const s = setup({ maxEntries: 2 });
  for (const key of ["send-0001", "send-0002", "send-0003"]) {
    await (await s.send(key, key)).text();
  }
  assert.equal(s.replay.size(), 2);
  await (await s.send("send-0003", "send-0003")).text();
  assert.equal(s.calls(), 3, "the newest is still stored");
  await (await s.send("send-0001", "send-0001")).text();
  assert.equal(s.calls(), 4, "the oldest was evicted");
});
