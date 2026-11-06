import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

type Listener = (event: Record<string, unknown>) => void;

function loadWorker(offline = false, puts: string[] = []) {
  const listeners: Record<string, Listener> = {};
  const fetched: string[] = [];
  const cache = new Map<string, string>();
  const self = {
    location: { origin: "https://bot.local" },
    addEventListener: (type: string, listener: Listener) => {
      listeners[type] = listener;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const caches = {
    open: async () => ({
      addAll: async () => {},
      put: async (request: { url: string }) => {
        puts.push(request.url);
      },
    }),
    keys: async () => [],
    delete: async () => true,
    match: async (request: string | { url: string }) => {
      const key = typeof request === "string" ? request : request.url;
      return cache.get(key);
    },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    fetch: async (request: { url: string }) => {
      if (offline) throw new Error("offline");
      fetched.push(request.url);
      return { ok: true, clone: () => "copy" };
    },
  });
  const source = readFileSync(
    new URL("../../../public/sw.js", import.meta.url),
    "utf8",
  );
  vm.runInContext(source, context);
  return { listeners, fetched, cache };
}

function fetchEvent(url: string, method = "GET", mode = "cors") {
  let responded: Promise<unknown> | undefined;
  return {
    event: {
      request: { url, method, mode },
      respondWith: (response: Promise<unknown>) => {
        responded = response;
      },
    },
    responded: () => responded,
  };
}

test("service worker ignores API calls and non-GET requests", () => {
  const { listeners } = loadWorker();
  for (const probe of [
    fetchEvent("https://bot.local/api/chat"),
    fetchEvent("https://bot.local/", "POST"),
    fetchEvent("https://other.example/x.js"),
  ]) {
    listeners.fetch(probe.event);
    assert.equal(probe.responded(), undefined);
  }
});

test("navigation is network-first and falls back to the cached shell offline", async () => {
  const online = loadWorker();
  const live = fetchEvent("https://bot.local/", "GET", "navigate");
  online.listeners.fetch(live.event);
  assert.equal(((await live.responded()) as { ok: boolean }).ok, true);

  const offline = loadWorker(true);
  offline.cache.set("/", "cached-shell");
  const down = fetchEvent("https://bot.local/", "GET", "navigate");
  offline.listeners.fetch(down.event);
  assert.equal(await down.responded(), "cached-shell");
});

test("unrelated same-origin requests are not intercepted", () => {
  const { listeners, fetched } = loadWorker();
  const other = fetchEvent("https://bot.local/some/page.json");
  listeners.fetch(other.event);
  assert.equal(other.responded(), undefined);
  assert.deepEqual(fetched, []);
});

test("build assets are cached on first fetch and reused offline", async () => {
  const puts: string[] = [];
  const first = loadWorker(false, puts);
  const asset = fetchEvent("https://bot.local/_next/static/app.js");
  first.listeners.fetch(asset.event);
  await asset.responded();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(puts, ["https://bot.local/_next/static/app.js"]);

  const offline = loadWorker(true);
  offline.cache.set("https://bot.local/_next/static/app.js", "cached-js");
  const again = fetchEvent("https://bot.local/_next/static/app.js");
  offline.listeners.fetch(again.event);
  assert.equal(await again.responded(), "cached-js");
});
