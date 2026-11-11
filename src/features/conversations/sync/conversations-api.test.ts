import assert from "node:assert/strict";
import test from "node:test";
import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import { createConversationsApi } from "./conversations-api.ts";

const msg = (id: number): MessageData => ({
  id,
  language: "en",
  role: id % 2 ? "user" : "assistant",
  text: `m${id}`,
});

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

test("get reads the thread with the client header", async () => {
  const { calls, fetchFn } = fakeFetch(() =>
    Response.json({ botId: "a", messages: [msg(1)], updatedAt: 5 }),
  );
  const result = await createConversationsApi(fetchFn).get("a");
  assert.ok(result.ok);
  assert.equal(result.messages.length, 1);
  assert.equal(calls[0]!.url, "/api/conversations?botId=a");
  assert.equal(
    new Headers(calls[0]!.init.headers).get("x-openbot-client"),
    "1",
  );
});

test("an empty thread reads as no messages", async () => {
  const { fetchFn } = fakeFetch(() =>
    Response.json({ botId: "a", messages: [], updatedAt: null }),
  );
  const result = await createConversationsApi(fetchFn).get("a");
  assert.ok(result.ok);
  assert.deepEqual(result.messages, []);
});

test("get drops entries that are not messages", async () => {
  const { fetchFn } = fakeFetch(() =>
    Response.json({ messages: [msg(1), { nope: true }] }),
  );
  const result = await createConversationsApi(fetchFn).get("a");
  assert.ok(result.ok);
  assert.equal(result.messages.length, 1);
});

test("a body without a messages list is a failed read", async () => {
  const { fetchFn } = fakeFetch(() => Response.json({ botId: "a" }));
  const result = await createConversationsApi(fetchFn).get("a");
  assert.equal(result.ok, false);
});

test("put sends the whole thread as JSON and encodes the bot id", async () => {
  const { calls, fetchFn } = fakeFetch(() =>
    Response.json({ botId: "a b", updatedAt: 1, count: 1 }),
  );
  const result = await createConversationsApi(fetchFn).put("a b", [msg(1)]);
  assert.ok(result.ok);
  assert.equal(calls[0]!.url, "/api/conversations?botId=a%20b");
  assert.equal(calls[0]!.init.method, "PUT");
  assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), {
    messages: [msg(1)],
  });
});

test("remove sends DELETE and accepts an empty 204", async () => {
  const { calls, fetchFn } = fakeFetch(
    () => new Response(null, { status: 204 }),
  );
  const result = await createConversationsApi(fetchFn).remove("a");
  assert.ok(result.ok);
  assert.equal(calls[0]!.init.method, "DELETE");
});

test("an error status keeps its code", async () => {
  const { fetchFn } = fakeFetch(() =>
    Response.json({ error: "too_many_messages" }, { status: 400 }),
  );
  const result = await createConversationsApi(fetchFn).put("a", []);
  assert.deepEqual(result, {
    ok: false,
    failure: { kind: "http", status: 400, error: "too_many_messages" },
  });
});

test("a refused connection is a network failure", async () => {
  const { fetchFn } = fakeFetch(() => {
    throw new TypeError("offline");
  });
  const result = await createConversationsApi(fetchFn).get("a");
  assert.deepEqual(result, { ok: false, failure: { kind: "network" } });
});
