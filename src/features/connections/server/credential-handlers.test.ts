import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { ConnectionId, CredentialStore } from "../core/index.ts";
import { handleDisconnect, handleStatus } from "./credential-handlers.ts";

const KEY = "sk-or-v1-OAUTH-SECRET-0123456789";

function memoryCredentials(): CredentialStore {
  const saved = new Map<ConnectionId, { key: string; at: number }>();
  return {
    save: async (id, key) => void saved.set(id, { key, at: 42 }),
    remove: async (id) => void saved.delete(id),
    status: async (id) => {
      const entry = saved.get(id);
      return entry
        ? { connected: true, updatedAt: entry.at }
        : { connected: false, updatedAt: null };
    },
  };
}

test("status says whether a key is saved, never the key", async () => {
  const credentials = memoryCredentials();
  await credentials.save("router", KEY);
  const response = await handleStatus("router", { credentials });
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(text), {
    id: "router",
    connected: true,
    updatedAt: 42,
  });
  assert.ok(!text.includes(KEY));
});

test("disconnect forgets the key and answers 204 every time", async () => {
  const credentials = memoryCredentials();
  await credentials.save("router", KEY);
  assert.equal((await handleDisconnect("router", { credentials })).status, 204);
  assert.equal((await handleDisconnect("router", { credentials })).status, 204);
  const status = await (await handleStatus("router", { credentials })).json();
  assert.equal(status.connected, false);
});

test("connections the vault does not keep, and unknown ids, are a 404", async () => {
  const credentials = memoryCredentials();
  for (const id of ["github", "dropbox"]) {
    assert.equal((await handleStatus(id, { credentials })).status, 404, id);
    assert.equal((await handleDisconnect(id, { credentials })).status, 404, id);
  }
});

test("a broken store is a 500 that names no value", async (t) => {
  t.mock.method(console, "error", () => {});
  const credentials = memoryCredentials();
  credentials.remove = () => Promise.reject(new Error("vault locked"));
  const response = await handleDisconnect("router", { credentials });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "unavailable" });
});

test("the connection routes stay thin and delegate to server/", () => {
  for (const path of [
    "[id]/route.ts",
    "[id]/start/route.ts",
    "[id]/callback/route.ts",
  ]) {
    const route = readFileSync(
      new URL(`../../../app/api/connections/${path}`, import.meta.url),
      "utf8",
    );
    assert.ok(route.split("\n").length < 30, path);
    assert.match(route, /features\/connections\/server\/index\.ts/, path);
  }
});
