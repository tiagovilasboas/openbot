import assert from "node:assert/strict";
import test from "node:test";
import { requestModelReply } from "./request-model-reply.ts";

const history = [{ role: "user" as const, text: "oi" }];

function respond(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

test("returns the model text on success", async () => {
  const outcome = await requestModelReply(
    "pt",
    history,
    respond({ provider: "local", text: "olá" }),
  );
  assert.deepEqual(outcome, { kind: "text", text: "olá" });
});

test("reports unavailable only for no_provider_configured", async () => {
  assert.deepEqual(
    await requestModelReply(
      "en",
      history,
      respond({ error: "no_provider_configured" }, 503),
    ),
    { kind: "unavailable" },
  );
  assert.deepEqual(
    await requestModelReply(
      "en",
      history,
      respond({ error: "provider_rejected" }, 502),
    ),
    { kind: "error" },
  );
});

test("network failure and empty replies are errors", async () => {
  const down: typeof fetch = async () => {
    throw new Error("offline");
  };
  assert.deepEqual(await requestModelReply("pt", history, down), {
    kind: "error",
  });
  assert.deepEqual(
    await requestModelReply("pt", history, respond({ text: "  " })),
    { kind: "error" },
  );
});

test("sends language and history to the server route", async () => {
  let body: unknown;
  const spy: typeof fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ text: "ok" }));
  };
  await requestModelReply("en", history, spy);
  assert.deepEqual(body, { language: "en", messages: history });

  const customConfig = {
    provider: "local" as const,
    baseUrl: "http://localhost:11434",
    model: "llama3",
  };
  await requestModelReply("pt", history, spy, customConfig);
  assert.deepEqual(body, {
    language: "pt",
    messages: history,
    config: customConfig,
  });

  await requestModelReply(
    "pt",
    history,
    spy,
    customConfig,
    "System Instructions",
  );
  assert.deepEqual(body, {
    language: "pt",
    messages: history,
    config: customConfig,
    systemPrompt: "System Instructions",
  });
});
