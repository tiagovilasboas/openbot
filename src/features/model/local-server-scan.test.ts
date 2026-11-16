import assert from "node:assert/strict";
import test from "node:test";
import { SCAN_BODY_MAX_BYTES, scanLocalServers } from "./local-server-scan.ts";
import type { FetchLike } from "./model-adapter.ts";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

test("both servers are listed with their model ids", async () => {
  const urls: string[] = [];
  const fetchImpl: FetchLike = async (input) => {
    urls.push(String(input));
    return json({ data: [{ id: "llama3.2:latest" }, { id: "bad id" }] });
  };
  const scan = await scanLocalServers(fetchImpl);
  assert.deepEqual(
    urls.sort(),
    [
      "http://127.0.0.1:11434/v1/models",
      "http://127.0.0.1:1234/v1/models",
    ].sort(),
  );
  assert.equal(scan.servers.length, 2);
  assert.deepEqual(scan.servers[0].models, ["llama3.2:latest"]);
  assert.deepEqual(scan.unreachable, []);
});

test("an unreachable server is reported by host only", async () => {
  const fetchImpl: FetchLike = async (input) => {
    if (String(input).includes(":1234")) {
      throw new Error(
        "connect ECONNREFUSED http://127.0.0.1:1234/v1/models?key=secret",
      );
    }
    return json({ data: [{ id: "m" }] });
  };
  const scan = await scanLocalServers(fetchImpl);
  assert.deepEqual(
    scan.servers.map((s) => s.id),
    ["ollama"],
  );
  assert.deepEqual(scan.unreachable, [
    { id: "lmstudio", host: "127.0.0.1:1234" },
  ]);
  assert.doesNotMatch(JSON.stringify(scan), /secret|ECONNREFUSED|v1\/models/);
});

test("an error status, a bad body or an oversize body is not a server", async () => {
  const responses = [
    () => new Response("no", { status: 500 }),
    () => new Response("not json", { status: 200 }),
    () => new Response("x".repeat(SCAN_BODY_MAX_BYTES + 10), { status: 200 }),
  ];
  for (const make of responses) {
    const scan = await scanLocalServers(async () => make());
    assert.deepEqual(scan.servers, []);
    assert.equal(scan.unreachable.length, 2);
  }
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
