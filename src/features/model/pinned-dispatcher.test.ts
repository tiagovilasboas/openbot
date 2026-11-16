import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo, LookupFunction } from "node:net";
import test from "node:test";
import { checkBaseUrl, type HostResolver } from "./base-url-guard.ts";
import { BlockedBaseUrlError, modelFetch } from "./guarded-model-fetch.ts";
import { pinnedDispatcher, pinnedLookup } from "./pinned-dispatcher.ts";

type Lookup = { error: unknown; address: unknown; family?: number };

function runLookup(
  lookup: LookupFunction,
  hostname: string,
  options: { all?: boolean; family?: number } = {},
): Promise<Lookup> {
  return new Promise((resolve) => {
    lookup(hostname, options, (error, address, family) =>
      resolve({ error, address, family }),
    );
  });
}

/** A resolver whose answers change on every call, like a rebinding server. */
function rebindingResolver(...answers: string[][]) {
  const calls: string[] = [];
  const resolver: HostResolver = async (hostname) => {
    calls.push(hostname);
    return answers[Math.min(calls.length, answers.length) - 1];
  };
  return { resolver, calls };
}

async function startServer(
  handler: Parameters<typeof createServer>[1],
): Promise<{ server: Server; port: number; hosts: string[] }> {
  const hosts: string[] = [];
  const server = createServer((req, res) => {
    hosts.push(String(req.headers.host));
    handler?.(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, port: (server.address() as AddressInfo).port, hosts };
}

test("pinnedLookup answers only with the pinned addresses", async () => {
  const lookup = pinnedLookup({
    hostname: "router.example",
    addresses: ["8.8.8.8", "2606:4700::1111"],
  });
  const all = await runLookup(lookup, "ROUTER.example.", { all: true });
  assert.deepEqual(all.address, [
    { address: "8.8.8.8", family: 4 },
    { address: "2606:4700::1111", family: 6 },
  ]);
  const v6 = await runLookup(lookup, "router.example", { family: 6 });
  assert.equal(v6.address, "2606:4700::1111");
  assert.equal(v6.family, 6);
  const other = await runLookup(lookup, "evil.example");
  assert.equal((other.error as { code?: string }).code, "ENOTFOUND");
});

test("an empty pin fails the lookup as not found", async () => {
  const lookup = pinnedLookup({ hostname: "nope.example", addresses: [] });
  const result = await runLookup(lookup, "nope.example", { all: true });
  assert.equal((result.error as { code?: string }).code, "ENOTFOUND");
});

test("public for the check, private afterwards: the connection keeps the public address", async () => {
  const { resolver, calls } = rebindingResolver(["8.8.8.8"], ["10.0.0.1"]);
  const verdict = await checkBaseUrl("https://rebind.example/v1", resolver);
  assert.ok(verdict.ok && verdict.pin);
  // The DNS server now answers with a private address...
  assert.deepEqual(await resolver("rebind.example"), ["10.0.0.1"]);
  // ...but the lookup the socket uses only knows the checked answer.
  const lookup = pinnedLookup(verdict.pin);
  for (let i = 0; i < 3; i++) {
    const result = await runLookup(lookup, "rebind.example", { all: true });
    assert.deepEqual(result.address, [{ address: "8.8.8.8", family: 4 }]);
  }
  assert.equal(calls.length, 2, "the connection path never re-resolves");
});

test("real fetch connects to the pinned address with the original Host", async () => {
  const { server, port, hosts } = await startServer((_req, res) =>
    res.end("{}"),
  );
  // Loopback stands in for the allowed answer, a private one comes after.
  const { resolver, calls } = rebindingResolver(["127.0.0.1"], ["10.0.0.1"]);
  const url = `http://rebind.test:${port}/v1`;
  try {
    const response = await modelFetch(
      fetch,
      url,
      {},
      {
        guardUrl: true,
        resolver,
      },
    );
    assert.equal(await response.text(), "{}");
    assert.deepEqual(hosts, [`rebind.test:${port}`]);
    assert.equal(calls.length, 1, "one DNS answer serves check and connect");

    await assert.rejects(
      modelFetch(fetch, url, {}, { guardUrl: true, resolver }),
      BlockedBaseUrlError,
    );
    assert.equal(hosts.length, 1);
  } finally {
    server.close();
  }
});

test("real fetch never dials a name the pin does not cover", async () => {
  // rebind.test is unresolvable by design: only the pin can route it.
  const { resolver } = rebindingResolver([]);
  await assert.rejects(
    modelFetch(
      fetch,
      "http://rebind.test:9/v1",
      {},
      {
        guardUrl: true,
        resolver,
      },
    ),
    (error: Error) => !(error instanceof BlockedBaseUrlError),
  );
});

test("guarded fetch refuses to follow a redirect", async () => {
  const { server, port, hosts } = await startServer((_req, res) => {
    res.writeHead(302, { location: "http://10.0.0.1/latest/meta-data" });
    res.end();
  });
  try {
    await assert.rejects(
      modelFetch(fetch, `http://localhost:${port}/v1`, {}, { guardUrl: true }),
    );
    assert.equal(hosts.length, 1);
  } finally {
    server.close();
  }
});

test("dispatchers are reused per pin and replaced when the answer changes", () => {
  const first = pinnedDispatcher({
    hostname: "a.example",
    addresses: ["8.8.8.8"],
  });
  const again = pinnedDispatcher({
    hostname: "a.example",
    addresses: ["8.8.8.8"],
  });
  const moved = pinnedDispatcher({
    hostname: "a.example",
    addresses: ["1.1.1.1"],
  });
  assert.ok(first);
  assert.equal(first, again);
  assert.notEqual(first, moved);
});
