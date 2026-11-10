import assert from "node:assert/strict";
import test from "node:test";
import { fakeStreamResponse, ndjson } from "./fake-stream-response.ts";
import { requestModelStream } from "./request-model-stream.ts";

const history = [{ role: "user" as const, text: "oi" }];
const delta = (text: string) => ({ type: "delta", text });
const done = { type: "done", provider: "stub" };

type Call = { url: string; init?: RequestInit };

/** Routes the stream URL and the plain URL to separate fakes. */
function router(handlers: {
  stream?: (init?: RequestInit) => Response | Promise<Response>;
  plain?: () => Response;
}) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url) === "/api/chat/stream" && handlers.stream) {
      return handlers.stream(init);
    }
    if (String(url) === "/api/chat" && handlers.plain) return handlers.plain();
    throw new TypeError("Failed to fetch");
  };
  return { calls, fetchImpl };
}

test("deltas split across chunks and lines are joined in order", async () => {
  const seen: string[] = [];
  const { fetchImpl } = router({
    stream: () =>
      fakeStreamResponse([
        '{"type":"start","provider":"stub"}\n{"type":"del',
        'ta","text":"Olá, "}\n{"type":"delta","text":"mun',
        'do"}\n',
        '{"type":"done","provider":"stub"}',
      ]),
  });
  const outcome = await requestModelStream(
    "pt",
    history,
    fetchImpl,
    null,
    undefined,
    { onText: (text) => seen.push(text) },
  );
  assert.deepEqual(outcome, { kind: "text", text: "Olá, mundo" });
  assert.deepEqual(seen, ["Olá, ", "Olá, mundo"]);
});

test("sends the guard header, the body and the bot's model id", async () => {
  const { calls, fetchImpl } = router({
    stream: () => fakeStreamResponse([ndjson(delta("x"), done)]),
  });
  await requestModelStream("en", history, fetchImpl, null, "SYSTEM", {
    modelId: "vendor/m",
  });
  const call = calls[0];
  assert.equal(call?.url, "/api/chat/stream");
  assert.equal(new Headers(call?.init?.headers).get("x-openbot-client"), "1");
  assert.deepEqual(JSON.parse(String(call?.init?.body)), {
    language: "en",
    messages: history,
    systemPrompt: "SYSTEM",
    modelId: "vendor/m",
  });
});

test("sends the bot's raw memory notes, and none when there are none", async () => {
  const { calls, fetchImpl } = router({
    stream: () => fakeStreamResponse([ndjson(delta("x"), done)]),
  });
  await requestModelStream("en", history, fetchImpl, null, "SYSTEM", {
    memory: ["Prefers short answers"],
  });
  await requestModelStream("en", history, fetchImpl, null, "SYSTEM", {
    memory: [],
  });
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)).memory, [
    "Prefers short answers",
  ]);
  assert.ok(!("memory" in JSON.parse(String(calls[1]?.init?.body))));
});

test("done carries the failover notice into the outcome", async () => {
  const failover = { fromModel: "a/x", toModel: "b/y", reason: "rate_limit" };
  const { fetchImpl } = router({
    stream: () =>
      fakeStreamResponse([ndjson(delta("ok"), { ...done, failover })]),
  });
  assert.deepEqual(await requestModelStream("en", history, fetchImpl), {
    kind: "text",
    text: "ok",
    failover,
  });
});

test("an error after some text keeps the text as a partial reply", async () => {
  const { calls, fetchImpl } = router({
    stream: () =>
      fakeStreamResponse([
        ndjson(delta("Meio "), delta("caminho"), {
          type: "error",
          code: "server",
          provider: "stub",
          status: 502,
        }),
      ]),
  });
  assert.deepEqual(await requestModelStream("pt", history, fetchImpl), {
    kind: "partial",
    text: "Meio caminho",
    failure: { kind: "server", status: 502 },
  });
  assert.equal(calls.length, 1, "a broken stream is never re-asked");
});

test("an error before any text is a plain failure", async () => {
  const { fetchImpl } = router({
    stream: () =>
      fakeStreamResponse([
        ndjson({ type: "error", code: "auth", provider: "stub", status: 401 }),
      ]),
  });
  assert.deepEqual(await requestModelStream("en", history, fetchImpl), {
    kind: "error",
    failure: { kind: "auth", status: 401 },
  });
});

test("an unknown error code degrades to unknown, never raw", async () => {
  const { fetchImpl } = router({
    stream: () =>
      fakeStreamResponse([
        ndjson({ type: "error", code: "provider_rejected", provider: "x" }),
      ]),
  });
  assert.deepEqual(await requestModelStream("en", history, fetchImpl), {
    kind: "error",
    failure: { kind: "unknown" },
  });
});

test("a body cut off without done keeps the text as partial", async () => {
  const { fetchImpl } = router({
    stream: () => fakeStreamResponse([ndjson(delta("cortado")), "{bad json"]),
  });
  assert.deepEqual(await requestModelStream("pt", history, fetchImpl), {
    kind: "partial",
    text: "cortado",
    failure: { kind: "unreachable" },
  });
});

test("a network error mid-body keeps the text as partial", async () => {
  const { fetchImpl } = router({
    stream: () =>
      fakeStreamResponse([ndjson(delta("quase")), new TypeError("reset")]),
  });
  const outcome = await requestModelStream("pt", history, fetchImpl, null, "", {
    isOnline: () => true,
  });
  assert.deepEqual(outcome, {
    kind: "partial",
    text: "quase",
    failure: { kind: "unreachable" },
  });
});

test("done with no text is an error, not an empty reply", async () => {
  const { fetchImpl } = router({
    stream: () => fakeStreamResponse([ndjson(done)]),
  });
  assert.deepEqual(await requestModelStream("en", history, fetchImpl), {
    kind: "error",
    failure: { kind: "unknown" },
  });
});

test("cancelling after text keeps it as a cancelled partial", async () => {
  const user = new AbortController();
  const { fetchImpl } = router({
    stream: (init) =>
      fakeStreamResponse([ndjson(delta("Já veio")), "stall"], init?.signal),
  });
  const pending = requestModelStream("pt", history, fetchImpl, null, "", {
    signal: user.signal,
    onText: () => user.abort(),
  });
  assert.deepEqual(await pending, {
    kind: "partial",
    text: "Já veio",
    failure: { kind: "cancelled" },
  });
});

test("cancelling before any text is a cancelled failure, no fallback", async () => {
  const user = new AbortController();
  const { calls, fetchImpl } = router({
    stream: (init) => fakeStreamResponse(["stall"], init?.signal),
    plain: () => Response.json({ text: "should not be asked" }),
  });
  const pending = requestModelStream("pt", history, fetchImpl, null, "", {
    signal: user.signal,
  });
  setTimeout(() => user.abort(), 5);
  assert.deepEqual(await pending, {
    kind: "error",
    failure: { kind: "cancelled" },
  });
  assert.deepEqual(
    calls.map((c) => c.url),
    ["/api/chat/stream"],
  );
});

test("the call time limit ends a stalled stream as a timeout", async () => {
  const { fetchImpl } = router({
    stream: (init) =>
      fakeStreamResponse([ndjson(delta("devagar")), "stall"], init?.signal),
  });
  const outcome = await requestModelStream("en", history, fetchImpl, null, "", {
    timeoutMs: 20,
  });
  assert.deepEqual(outcome, {
    kind: "partial",
    text: "devagar",
    failure: { kind: "timeout" },
  });
});

test("an unreachable stream route falls back to /api/chat once", async () => {
  const { calls, fetchImpl } = router({
    plain: () => Response.json({ provider: "stub", text: "via plain" }),
  });
  assert.deepEqual(await requestModelStream("en", history, fetchImpl), {
    kind: "text",
    text: "via plain",
  });
  assert.deepEqual(
    calls.map((c) => c.url),
    ["/api/chat/stream", "/api/chat"],
  );
});

test("a plain error status from the stream route falls back too", async () => {
  for (const status of [400, 429, 503]) {
    const { calls, fetchImpl } = router({
      stream: () => Response.json({ error: "x" }, { status }),
      plain: () => Response.json({ text: "from plain" }),
    });
    const outcome = await requestModelStream("en", history, fetchImpl);
    assert.deepEqual(
      outcome,
      { kind: "text", text: "from plain" },
      `${status}`,
    );
    assert.equal(calls.length, 2);
  }
});

test("a 200 that is not a stream falls back", async () => {
  const { fetchImpl } = router({
    stream: () => new Response("<html></html>", { status: 200 }),
    plain: () => Response.json({ text: "from plain" }),
  });
  assert.deepEqual(await requestModelStream("en", history, fetchImpl), {
    kind: "text",
    text: "from plain",
  });
});

test("the fallback keeps the plain route's error classification", async () => {
  const { fetchImpl } = router({
    stream: () => new Response("nope", { status: 404 }),
    plain: () =>
      Response.json({ error: "no_provider_configured" }, { status: 503 }),
  });
  assert.deepEqual(await requestModelStream("en", history, fetchImpl), {
    kind: "unavailable",
  });
});

test("when both routes are unreachable the failure is reported once", async () => {
  const { calls, fetchImpl } = router({});
  const outcome = await requestModelStream("en", history, fetchImpl, null, "", {
    isOnline: () => false,
  });
  assert.deepEqual(outcome, { kind: "error", failure: { kind: "offline" } });
  assert.equal(calls.length, 2);
});
