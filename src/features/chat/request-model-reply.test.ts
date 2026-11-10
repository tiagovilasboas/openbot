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
    { kind: "error", failure: { kind: "server", status: 502 } },
  );
  assert.deepEqual(
    await requestModelReply(
      "en",
      history,
      respond(
        {
          error: "provider_rejected",
          detail: "401: No cookie auth credentials found",
        },
        502,
      ),
    ),
    { kind: "error", failure: { kind: "auth", status: 401 } },
  );
});

test("network failure and empty replies are errors", async () => {
  const down: typeof fetch = async () => {
    throw new Error("offline");
  };
  assert.deepEqual(await requestModelReply("pt", history, down), {
    kind: "error",
    failure: { kind: "unreachable" },
  });
  assert.deepEqual(
    await requestModelReply("pt", history, respond({ text: "  " })),
    { kind: "error", failure: { kind: "unknown" } },
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

/** A fetch that never answers, but rejects like the browser when aborted. */
const hanging: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () =>
      reject(new DOMException("aborted", "AbortError")),
    );
    if (init?.signal?.aborted)
      reject(new DOMException("aborted", "AbortError"));
  });

test("a call that never answers times out", async () => {
  const outcome = await requestModelReply(
    "en",
    history,
    hanging,
    null,
    undefined,
    { timeoutMs: 10 },
  );
  assert.deepEqual(outcome, { kind: "error", failure: { kind: "timeout" } });
});

test("the user's signal cancels the in-flight call", async () => {
  const user = new AbortController();
  const pending = requestModelReply("en", history, hanging, null, undefined, {
    signal: user.signal,
  });
  user.abort();
  assert.deepEqual(await pending, {
    kind: "error",
    failure: { kind: "cancelled" },
  });
});

test("an already-cancelled signal fails at once as cancelled", async () => {
  const user = new AbortController();
  user.abort();
  const outcome = await requestModelReply(
    "en",
    history,
    hanging,
    null,
    undefined,
    { signal: user.signal },
  );
  assert.deepEqual(outcome, { kind: "error", failure: { kind: "cancelled" } });
});

test("a thrown fetch is offline only when the browser says so", async () => {
  const down: typeof fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  const offline = await requestModelReply(
    "pt",
    history,
    down,
    null,
    undefined,
    {
      isOnline: () => false,
    },
  );
  assert.deepEqual(offline, { kind: "error", failure: { kind: "offline" } });
  const online = await requestModelReply("pt", history, down, null, undefined, {
    isOnline: () => true,
  });
  assert.deepEqual(online, { kind: "error", failure: { kind: "unreachable" } });
});

test("each call gets its own time limit", async () => {
  const user = new AbortController();
  const first = requestModelReply("en", history, hanging, null, undefined, {
    signal: user.signal,
    timeoutMs: 10,
  });
  const second = requestModelReply("en", history, hanging, null, undefined, {
    signal: user.signal,
    timeoutMs: 40,
  });
  assert.equal((await first).kind, "error");
  assert.deepEqual(await second, {
    kind: "error",
    failure: { kind: "timeout" },
  });
  assert.equal(
    user.signal.aborted,
    false,
    "a timeout does not cancel the turn",
  );
});
