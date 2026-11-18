import assert from "node:assert/strict";
import test from "node:test";
import {
  SCAN_BODY_MAX_BYTES,
  SCAN_TIMEOUT_MS,
  scanLocalServers,
} from "./local-server-scan.ts";
import type { FetchLike } from "./model-adapter.ts";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

const byId = (scan: Awaited<ReturnType<typeof scanLocalServers>>, id: string) =>
  scan.results.find((r) => r.id === id);

test("Ollama /api/tags and LM Studio /v1/models are both parsed", async () => {
  const urls: string[] = [];
  const fetchImpl: FetchLike = async (input) => {
    const url = String(input);
    urls.push(url);
    return url.includes(":11434")
      ? json({ models: [{ name: "llama3.2:latest" }, { name: "bad id" }] })
      : json({ data: [{ id: "qwen" }, { id: "qwen" }, 7, null] });
  };
  const scan = await scanLocalServers(fetchImpl);
  assert.deepEqual(
    urls.sort(),
    [
      "http://127.0.0.1:11434/api/tags",
      "http://127.0.0.1:1234/v1/models",
    ].sort(),
  );
  const ollama = byId(scan, "ollama");
  assert.equal(ollama?.status, "found");
  assert.deepEqual(ollama?.status === "found" && ollama.models, [
    "llama3.2:latest",
  ]);
  const lm = byId(scan, "lmstudio");
  assert.deepEqual(lm?.status === "found" && lm.models, ["qwen"]);
});

test("a refused or timed-out connection is not_running", async () => {
  const scan = await scanLocalServers(async (_input, options) => {
    if (options?.signal) throw new Error("ECONNREFUSED 127.0.0.1:1234");
    throw new Error("unreachable");
  });
  assert.deepEqual(
    scan.results.map((r) => r.status),
    ["not_running", "not_running"],
  );
  assert.equal(SCAN_TIMEOUT_MS, 1_500);
});

test("every request carries a timeout signal", async () => {
  const signals: unknown[] = [];
  await scanLocalServers(async (_input, options) => {
    signals.push(options?.signal);
    return json({ data: [] });
  });
  assert.ok(signals.every((s) => s instanceof AbortSignal));
});

test("a bad status, bad json or wrong shape is an error with host only", async () => {
  const responses = [
    () => new Response("secret-body", { status: 500 }),
    () => new Response("not json secret-body", { status: 200 }),
    () => json({ nothing: "secret-body" }),
    () => json([1, 2]),
    () => json(null),
  ];
  for (const make of responses) {
    const scan = await scanLocalServers(async () => make());
    assert.deepEqual(
      scan.results.map((r) => r.status),
      ["error", "error"],
    );
    assert.deepEqual(
      scan.results.map((r) => (r.status === "error" ? r.host : "")),
      ["127.0.0.1:11434", "127.0.0.1:1234"],
    );
    assert.doesNotMatch(JSON.stringify(scan), /secret|\/api\/tags|v1\/models/);
  }
});

test("a body past the size cap is aborted as an error", async () => {
  let cancelled = false;
  const big = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(SCAN_BODY_MAX_BYTES / 2 + 1));
    },
    cancel() {
      cancelled = true;
    },
  });
  const scan = await scanLocalServers(async (input) =>
    String(input).includes(":1234")
      ? json({ data: [] })
      : new Response(big, { status: 200 }),
  );
  assert.equal(byId(scan, "ollama")?.status, "error");
  assert.equal(cancelled, true);
});

test("requests refuse redirects and never carry credentials", async () => {
  let init: RequestInit | undefined;
  await scanLocalServers(async (_input, options) => {
    init = options;
    return json({ data: [] });
  });
  assert.equal(init?.redirect, "error");
  assert.equal(init?.method, "GET");
  assert.deepEqual(Object.keys(init?.headers ?? {}), ["accept"]);
});
