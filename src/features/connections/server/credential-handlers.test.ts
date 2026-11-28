import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type {
  ConnectCredential,
  ConnectionId,
  CredentialStore,
} from "../core/index.ts";
import { handleDisconnect, handleStatus } from "./credential-handlers.ts";

const KEY = "sk-or-v1-OAUTH-SECRET-0123456789";

function memoryCredentials(): CredentialStore {
  const saved = new Map<
    ConnectionId,
    { credential: ConnectCredential; at: number }
  >();
  return {
    save: async (id, credential) => void saved.set(id, { credential, at: 42 }),
    remove: async (id) => void saved.delete(id),
    status: async (id) => {
      const entry = saved.get(id);
      if (!entry) return { connected: false, updatedAt: null };
      if (entry.credential.kind === "oauth-session") {
        return {
          connected: true,
          updatedAt: entry.at,
          expiresAt: entry.credential.expiresAt,
          needsReauth: false,
          accountLabel: entry.credential.accountLabel ?? null,
        };
      }
      return { connected: true, updatedAt: entry.at };
    },
  };
}

test("status says whether a key is saved, never the key", async () => {
  const credentials = memoryCredentials();
  await credentials.save("router", { kind: "api-key", secret: KEY });
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

test("status exposes non-secret oauth session metadata for chatgpt without leaking tokens", async () => {
  const credentials = memoryCredentials();
  await credentials.save("chatgpt", {
    kind: "oauth-session",
    accessToken: "at_secret",
    refreshToken: "rt_secret",
    expiresAt: 9999,
    clientId: "oaiapp_secret",
    accountLabel: "Plus",
  });
  const response = await handleStatus("chatgpt", { credentials });
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(text), {
    id: "chatgpt",
    connected: true,
    updatedAt: 42,
    expiresAt: 9999,
    needsReauth: false,
    accountLabel: "Plus",
  });
  assert.ok(!text.includes("at_secret"));
  assert.ok(!text.includes("rt_secret"));
  assert.ok(!text.includes("oaiapp_secret"));
});

test("disconnect forgets the key or session and answers 204 every time", async () => {
  const credentials = memoryCredentials();
  await credentials.save("router", { kind: "api-key", secret: KEY });
  assert.equal((await handleDisconnect("router", { credentials })).status, 204);
  assert.equal((await handleDisconnect("router", { credentials })).status, 204);
  const status = await (await handleStatus("router", { credentials })).json();
  assert.equal(status.connected, false);

  await credentials.save("chatgpt", {
    kind: "oauth-session",
    accessToken: "at_secret",
    expiresAt: null,
  });
  assert.equal(
    (await handleDisconnect("chatgpt", { credentials })).status,
    204,
  );
  const chatgptStatus = await (
    await handleStatus("chatgpt", { credentials })
  ).json();
  assert.equal(chatgptStatus.connected, false);
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
