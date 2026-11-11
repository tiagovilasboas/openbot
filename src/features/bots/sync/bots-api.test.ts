import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../crew-presets.ts";
import { createBotsApi } from "./bots-api.ts";

const [a] = CREW_PRESETS;
const body = { bots: [a], activeBotId: a!.id, mainBotId: a!.id };

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

test("get reads the state and sends the client header", async () => {
  const { calls, fetchFn } = fakeFetch(() => Response.json(body));
  const result = await createBotsApi(fetchFn).get();
  assert.ok(result.ok);
  assert.equal(result.state.bots[0]!.id, a!.id);
  assert.equal(result.state.mainBotId, a!.id);
  assert.equal(calls[0]!.url, "/api/bots");
  assert.equal(
    new Headers(calls[0]!.init.headers).get("x-openbot-client"),
    "1",
  );
});

test("put sends the whole payload as JSON", async () => {
  const { calls, fetchFn } = fakeFetch(() => Response.json(body));
  const payload = { bots: [a!], activeBotId: a!.id, mainBotId: a!.id };
  const result = await createBotsApi(fetchFn).put(payload);
  assert.ok(result.ok);
  assert.equal(calls[0]!.init.method, "PUT");
  assert.equal(
    new Headers(calls[0]!.init.headers).get("content-type"),
    "application/json",
  );
  assert.deepEqual(JSON.parse(String(calls[0]!.init.body)).activeBotId, a!.id);
});

test("an error body becomes a failure with status and code", async () => {
  const { fetchFn } = fakeFetch(() =>
    Response.json({ error: "main_bot_required" }, { status: 400 }),
  );
  const result = await createBotsApi(fetchFn).put({
    bots: [a!],
    activeBotId: a!.id,
    mainBotId: a!.id,
  });
  assert.deepEqual(result, {
    ok: false,
    failure: { kind: "http", status: 400, error: "main_bot_required" },
  });
});

test("a thrown fetch or a malformed answer is a network failure", async () => {
  const thrown = createBotsApi((async () => {
    throw new Error("offline");
  }) as unknown as typeof fetch);
  assert.deepEqual(await thrown.get(), {
    ok: false,
    failure: { kind: "network" },
  });
  const { fetchFn } = fakeFetch(() => new Response("<html>", { status: 200 }));
  assert.deepEqual(await createBotsApi(fetchFn).get(), {
    ok: false,
    failure: { kind: "network" },
  });
});

test("invalid bots in an answer are dropped by the client sanitizer", async () => {
  const { fetchFn } = fakeFetch(() =>
    Response.json({ bots: [a, { id: "", name: "" }, null], mainBotId: null }),
  );
  const result = await createBotsApi(fetchFn).get();
  assert.ok(result.ok);
  assert.equal(result.state.bots.length, 1);
  assert.equal(result.state.mainBotId, null);
});
