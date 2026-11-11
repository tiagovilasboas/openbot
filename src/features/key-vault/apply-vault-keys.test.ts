import assert from "node:assert/strict";
import test from "node:test";
import type { ModelRequest } from "../model/model-adapter.ts";
import {
  withVaultKey,
  withVaultKeys,
  type KeyLookup,
} from "./apply-vault-keys.ts";

// A vault that holds one OpenRouter key, for openrouter.ai only.
const vault: KeyLookup = (provider, origin) =>
  provider === "router" && origin === "https://openrouter.ai"
    ? "vault-key"
    : provider === "anthropic" && origin === "https://api.anthropic.com"
      ? "vault-ant"
      : undefined;

const openRouter = {
  provider: "router" as const,
  baseUrl: "https://openrouter.ai/api/v1",
  model: "m",
};

test("the vault key is used for the origin it was saved for", () => {
  assert.deepEqual(withVaultKey(openRouter, vault), {
    ...openRouter,
    apiKey: "vault-key",
  });
  assert.deepEqual(
    withVaultKey({ provider: "anthropic", model: "claude" }, vault),
    { provider: "anthropic", model: "claude", apiKey: "vault-ant" },
  );
});

test("the vault key is not used for a different origin", () => {
  const other = { ...openRouter, baseUrl: "https://evil.example/v1" };
  assert.deepEqual(withVaultKey(other, vault), other);
  const lookalike = {
    ...openRouter,
    baseUrl: "https://openrouter.ai.evil.test/v1",
  };
  assert.deepEqual(withVaultKey(lookalike, vault), lookalike);
  const plain = { ...openRouter, baseUrl: "http://openrouter.ai/api/v1" };
  assert.deepEqual(withVaultKey(plain, vault), plain);
});

test("a key the request carries wins over the vault", () => {
  const typed = { ...openRouter, apiKey: "typed" };
  assert.equal(withVaultKey(typed, vault), typed);
});

test("a local config never gets a key", () => {
  const local = {
    provider: "local" as const,
    baseUrl: "http://localhost:11434",
    model: "llama3",
  };
  assert.equal(
    withVaultKey(local, () => "any"),
    local,
  );
});

test("a vault with nothing saved changes nothing", () => {
  assert.equal(
    withVaultKey(openRouter, () => undefined),
    openRouter,
  );
});

test("both the main and the fallback config are keyed", () => {
  const request: ModelRequest = {
    language: "en",
    messages: [{ role: "user", text: "hi" }],
    config: openRouter,
    fallbackConfig: { provider: "anthropic", model: "claude" },
  };
  const keyed = withVaultKeys(request, vault);
  assert.equal(
    keyed.config?.provider === "router" && keyed.config.apiKey,
    "vault-key",
  );
  assert.equal(
    keyed.fallbackConfig?.provider === "anthropic" &&
      keyed.fallbackConfig.apiKey,
    "vault-ant",
  );
  assert.equal(request.config, openRouter);
});

test("a request with no config stays without one", () => {
  const request: ModelRequest = {
    language: "en",
    messages: [{ role: "user", text: "hi" }],
  };
  assert.deepEqual(withVaultKeys(request, vault), request);
});
