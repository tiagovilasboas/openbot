import assert from "node:assert/strict";
import test from "node:test";
import { isOpenRouterUrl } from "./openrouter-url.ts";

test("the OpenRouter API URL and its subdomains are OpenRouter", () => {
  assert.equal(isOpenRouterUrl("https://openrouter.ai/api/v1"), true);
  assert.equal(isOpenRouterUrl("https://OPENROUTER.ai/api/v1"), true);
  assert.equal(isOpenRouterUrl("https://api.openrouter.ai/v1"), true);
});

test("a lookalike host is not OpenRouter", () => {
  assert.equal(isOpenRouterUrl("https://openrouter.ai.example.net/v1"), false);
  assert.equal(isOpenRouterUrl("https://notopenrouter.ai/v1"), false);
});

test("the name in the path or query is not OpenRouter", () => {
  assert.equal(
    isOpenRouterUrl("http://localhost:20128/openrouter.ai/v1"),
    false,
  );
  assert.equal(
    isOpenRouterUrl("http://localhost:3000/v1?h=openrouter.ai"),
    false,
  );
});

test("a URL that cannot be parsed is not OpenRouter", () => {
  assert.equal(isOpenRouterUrl("openrouter.ai"), false);
  assert.equal(isOpenRouterUrl(""), false);
});
