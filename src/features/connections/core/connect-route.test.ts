import assert from "node:assert/strict";
import { test } from "node:test";
import { canTakeCallback, connectRoute } from "./connect-route.ts";
import {
  CONNECTION_IDS,
  connectionMethods,
  isConnectionId,
} from "./connection-methods.ts";

test("https and loopback http origins can take a callback", () => {
  assert.equal(canTakeCallback("https://bot.example.com"), true);
  assert.equal(canTakeCallback("http://localhost:3000"), true);
  assert.equal(canTakeCallback("http://127.0.0.1:3801"), true);
  assert.equal(canTakeCallback("http://[::1]:3000"), true);
});

test("chatgpt callbacks are restricted to loopback origins", () => {
  assert.equal(canTakeCallback("http://localhost:3000", "chatgpt"), true);
  assert.equal(canTakeCallback("http://127.0.0.1:3801", "chatgpt"), true);
  assert.equal(canTakeCallback("http://[::1]:3000", "chatgpt"), true);
  assert.equal(canTakeCallback("https://bot.example.com", "chatgpt"), false);
  assert.equal(canTakeCallback("http://192.168.0.10:3000", "chatgpt"), false);
  assert.equal(canTakeCallback("ftp://localhost", "chatgpt"), false);
});

test("plain http on a LAN or a bad value cannot take a callback", () => {
  assert.equal(canTakeCallback("http://192.168.0.10:3000"), false);
  assert.equal(canTakeCallback("http://bot.local:3000"), false);
  assert.equal(canTakeCallback("ftp://localhost"), false);
  assert.equal(canTakeCallback("not a url"), false);
});

test("OpenRouter connects by OAuth where a callback can land", () => {
  assert.deepEqual(connectRoute("router", "http://localhost:3000"), {
    connect: "oauth",
    alternative: "api-key",
  });
});

test("OpenRouter falls back to its key when no callback can land", () => {
  assert.deepEqual(connectRoute("router", "http://192.168.0.10:3000"), {
    connect: "api-key",
    alternative: null,
  });
});

test("ChatGPT connects by OAuth on loopback and has no fallback elsewhere", () => {
  assert.deepEqual(connectRoute("chatgpt", "http://localhost:3000"), {
    connect: "oauth",
    alternative: null,
  });
  assert.deepEqual(connectRoute("chatgpt", "https://bot.example.com"), {
    connect: null,
    alternative: null,
  });
  assert.deepEqual(connectRoute("chatgpt", "http://192.168.0.10:3000"), {
    connect: null,
    alternative: null,
  });
});

test("key-only services ignore the origin", () => {
  for (const origin of ["http://localhost:3000", "http://192.168.0.10"]) {
    assert.deepEqual(connectRoute("anthropic", origin), {
      connect: "api-key",
      alternative: null,
    });
    assert.deepEqual(connectRoute("github", origin), {
      connect: "api-key",
      alternative: null,
    });
  }
});

test("Anthropic never offers OAuth", () => {
  const { preferred, alternative } = connectionMethods("anthropic");
  assert.notEqual(preferred, "oauth");
  assert.notEqual(alternative, "oauth");
});

test("every id has methods and the guard knows only those ids", () => {
  for (const id of CONNECTION_IDS) {
    assert.equal(isConnectionId(id), true);
    assert.ok(connectionMethods(id).preferred);
  }
  assert.equal(isConnectionId("chatgpt"), true);
  assert.equal(isConnectionId("openai"), false);
  assert.equal(isConnectionId("toString"), false);
  assert.equal(isConnectionId(42), false);
});
