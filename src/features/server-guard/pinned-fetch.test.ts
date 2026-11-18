import assert from "node:assert/strict";
import { createServer as createHttp } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer as createTls } from "node:tls";
import test from "node:test";
import { createPinnedFetch } from "./pinned-fetch.ts";

async function stubServer() {
  const seen: { host?: string; remote?: string }[] = [];
  const server = createHttp((req, res) => {
    seen.push({ host: req.headers.host, remote: req.socket.localAddress });
    res.setHeader("set-cookie", ["a=1", "b=2"]);
    res.end("pinned");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  return { server, seen, port };
}

test("a private answer is refused at connect time", async () => {
  const fetchImpl = createPinnedFetch({ resolve: async () => ["10.0.0.5"] });
  await assert.rejects(fetchImpl("http://rebind.test/"), /blocked_address/);
});

test("a mixed public and private answer is refused", async () => {
  for (const answer of [
    ["93.184.216.34", "10.0.0.5"],
    ["10.0.0.5", "93.184.216.34"],
  ]) {
    const fetchImpl = createPinnedFetch({ resolve: async () => answer });
    await assert.rejects(fetchImpl("http://mixed.test/"), /blocked_address/);
  }
});

test("an empty answer is refused", async () => {
  const fetchImpl = createPinnedFetch({ resolve: async () => [] });
  await assert.rejects(fetchImpl("http://empty.test/"), /blocked_address/);
});

test("it connects to the validated address and keeps the original Host", async () => {
  const { server, seen, port } = await stubServer();
  try {
    const resolved: string[] = [];
    const fetchImpl = createPinnedFetch({
      resolve: async (host) => {
        resolved.push(host);
        return ["127.0.0.1"];
      },
      isAllowed: () => true, // test only: the stub listens on loopback
    });
    const response = await fetchImpl(`http://pin.test:${port}/x`);
    assert.equal(await response.text(), "pinned");
    assert.deepEqual(resolved, ["pin.test"]);
    assert.equal(seen[0].host, `pin.test:${port}`);
    assert.equal(seen[0].remote, "127.0.0.1");
    assert.deepEqual(response.headers.getSetCookie(), ["a=1", "b=2"]);
  } finally {
    server.close();
  }
});

test("TLS uses the original hostname as SNI on the validated address", async () => {
  const names: string[] = [];
  const server = createTls({
    SNICallback: (name, cb) => {
      names.push(name);
      cb(new Error("stop"), undefined);
    },
  });
  server.on("tlsClientError", () => undefined);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  try {
    const fetchImpl = createPinnedFetch({
      resolve: async () => ["127.0.0.1"],
      isAllowed: () => true, // test only
    });
    await assert.rejects(fetchImpl(`https://sni.test:${port}/`));
    assert.deepEqual(names, ["sni.test"]);
  } finally {
    server.close();
  }
});

test("sockets are never pooled across requests", async () => {
  const { server, port } = await stubServer();
  const sockets: number[] = [];
  server.on("connection", (socket) => sockets.push(socket.remotePort ?? 0));
  try {
    const fetchImpl = createPinnedFetch({
      resolve: async () => ["127.0.0.1"],
      isAllowed: () => true, // test only
    });
    await (await fetchImpl(`http://pool.test:${port}/`)).text();
    await (await fetchImpl(`http://pool.test:${port}/`)).text();
    assert.equal(new Set(sockets).size, 2);
  } finally {
    server.close();
  }
});
