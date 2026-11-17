import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../../shared/testing/register-alias-resolver.mjs";
import "../../../shared/testing/temp-data-dir.mjs";

const { POST } = await import("./route.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function body(text = "hello") {
  return {
    language: "en",
    messages: [{ role: "user", text }],
    config: {
      provider: "router",
      baseUrl: "https://router.test/v1",
      model: "vendor/model-a",
      apiKey: "client-key",
    },
  };
}

function post(payload: unknown, key?: string) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key ? { "idempotency-key": key } : {}),
      },
      body: JSON.stringify(payload),
    }),
  );
}

function stubModel(reply: () => Response | Promise<Response>) {
  const counter = { calls: 0 };
  globalThis.fetch = (async () => {
    counter.calls += 1;
    return reply();
  }) as typeof fetch;
  return counter;
}

const completion = (text: string) =>
  Response.json({ choices: [{ message: { content: text } }] });

test("a repeated send id returns the stored reply without a second model call", async () => {
  const model = stubModel(() => completion("once"));
  const first = await post(body(), "replay-hit-0001");
  const second = await post(body(), "replay-hit-0001");
  assert.equal(first.status, 200);
  assert.deepEqual(await second.json(), await first.json());
  assert.equal(model.calls, 1);
});

test("the same send id with another body is a conflict", async () => {
  const model = stubModel(() => completion("once"));
  await post(body("one"), "replay-clash-01");
  const clash = await post(body("two"), "replay-clash-01");
  assert.equal(clash.status, 409);
  assert.deepEqual(await clash.json(), { error: "idempotency_conflict" });
  assert.equal(model.calls, 1);
});

test("a concurrent duplicate waits for the first and shares its reply", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const model = stubModel(async () => {
    await gate;
    return completion("shared");
  });
  const first = post(body(), "replay-flight-1");
  const second = post(body(), "replay-flight-1");
  await new Promise((resolve) => setTimeout(resolve, 20));
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(await b.json(), await a.json());
  assert.equal(model.calls, 1);
});

test("a failed send is not cached, so the same id retries for real", async () => {
  let ok = false;
  const model = stubModel(() =>
    ok ? completion("fine") : new Response("nope", { status: 500 }),
  );
  const failed = await post(body(), "replay-retry-01");
  assert.equal(failed.status, 502);
  const afterFailure = model.calls;
  ok = true;
  const retry = await post(body(), "replay-retry-01");
  assert.equal(retry.status, 200);
  assert.equal(model.calls, afterFailure + 1);
});

test("a send without an id is never replayed", async () => {
  const model = stubModel(() => completion("x"));
  await post(body());
  await post(body());
  assert.equal(model.calls, 2);
});
