import assert from "node:assert/strict";
import test from "node:test";
import { createUsageApi } from "./usage-api.ts";

const rec = {
  botId: "a",
  day: "2026-01-02",
  inputTokens: 1,
  outputTokens: 2,
  calls: 1,
  callsWithoutUsage: 0,
};

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

test("get reads the log with the client header", async () => {
  const { calls, fetchFn } = fakeFetch(() =>
    Response.json({ records: [rec, { junk: 1 }], updatedAt: 5 }),
  );
  const result = await createUsageApi(fetchFn).get();
  assert.ok(result.ok);
  assert.deepEqual(result.records, [rec]);
  assert.equal(calls[0]!.url, "/api/usage");
  assert.equal(
    new Headers(calls[0]!.init.headers).get("x-openbot-client"),
    "1",
  );
});

test("a reply without records is a failure, not an empty log", async () => {
  const { fetchFn } = fakeFetch(() => Response.json({ other: 1 }));
  const result = await createUsageApi(fetchFn).get();
  assert.equal(result.ok, false);
});

test("put sends the records as JSON", async () => {
  const { calls, fetchFn } = fakeFetch(() =>
    Response.json({ updatedAt: 1, count: 1 }),
  );
  const result = await createUsageApi(fetchFn).put([rec]);
  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0]!.init.method, "PUT");
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), {
    records: [rec],
  });
});

test("a refusal carries its status and code", async () => {
  const { fetchFn } = fakeFetch(() =>
    Response.json({ error: "too_many_records" }, { status: 400 }),
  );
  const result = await createUsageApi(fetchFn).put([rec]);
  assert.deepEqual(result, {
    ok: false,
    failure: { kind: "http", status: 400, error: "too_many_records" },
  });
});

test("a lost connection is a network failure", async () => {
  const fetchFn = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  const result = await createUsageApi(fetchFn).put([rec]);
  assert.deepEqual(result, { ok: false, failure: { kind: "network" } });
});
