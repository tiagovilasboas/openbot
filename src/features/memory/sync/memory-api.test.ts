import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryApi } from "./memory-api.ts";

const note = (n: number) => ({
  id: `mem_${n}`,
  text: `note ${n}`,
  createdAt: "2026-01-01T00:00:00.000Z",
});

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

test("get reads the notes with the client header", async () => {
  const { calls, fetchFn } = fakeFetch(() =>
    Response.json({ botId: "a", entries: [note(1)], updatedAt: 5 }),
  );
  const result = await createMemoryApi(fetchFn).get("a");
  assert.ok(result.ok);
  assert.deepEqual(result.entries, [note(1)]);
  assert.equal(calls[0]!.url, "/api/memory?botId=a");
  assert.equal(
    new Headers(calls[0]!.init.headers).get("x-openbot-client"),
    "1",
  );
});

test("an empty list reads as no entries", async () => {
  const { fetchFn } = fakeFetch(() =>
    Response.json({ botId: "a", entries: [], updatedAt: null }),
  );
  const result = await createMemoryApi(fetchFn).get("a");
  assert.ok(result.ok);
  assert.deepEqual(result.entries, []);
});

test("get drops entries that are not notes", async () => {
  const { fetchFn } = fakeFetch(() =>
    Response.json({ entries: [note(1), { nope: true }, 7] }),
  );
  const result = await createMemoryApi(fetchFn).get("a");
  assert.ok(result.ok);
  assert.deepEqual(result.entries, [note(1)]);
});

test("a body without an entries list is a failed read", async () => {
  const { fetchFn } = fakeFetch(() => Response.json({ botId: "a" }));
  const result = await createMemoryApi(fetchFn).get("a");
  assert.equal(result.ok, false);
});

test("put sends the whole list as JSON and encodes the bot id", async () => {
  const { calls, fetchFn } = fakeFetch(() =>
    Response.json({ botId: "a b", updatedAt: 1, count: 1 }),
  );
  const result = await createMemoryApi(fetchFn).put("a b", [note(1)]);
  assert.ok(result.ok);
  assert.equal(calls[0]!.url, "/api/memory?botId=a%20b");
  assert.equal(calls[0]!.init.method, "PUT");
  assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), {
    entries: [note(1)],
  });
});

test("remove sends DELETE and accepts an empty 204", async () => {
  const { calls, fetchFn } = fakeFetch(
    () => new Response(null, { status: 204 }),
  );
  const result = await createMemoryApi(fetchFn).remove("a");
  assert.ok(result.ok);
  assert.equal(calls[0]!.init.method, "DELETE");
});

test("an error status keeps its code", async () => {
  const { fetchFn } = fakeFetch(() =>
    Response.json({ error: "too_many_entries" }, { status: 400 }),
  );
  const result = await createMemoryApi(fetchFn).put("a", []);
  assert.deepEqual(result, {
    ok: false,
    failure: { kind: "http", status: 400, error: "too_many_entries" },
  });
});

test("a refused connection is a network failure", async () => {
  const { fetchFn } = fakeFetch(() => {
    throw new TypeError("offline");
  });
  const result = await createMemoryApi(fetchFn).get("a");
  assert.deepEqual(result, { ok: false, failure: { kind: "network" } });
});
