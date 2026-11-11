import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeProviderKeys } from "./provider-keys.ts";

test("sanitizeProviderKeys keeps known providers with usable keys", () => {
  assert.deepEqual(
    sanitizeProviderKeys({
      router: "  sk-or-1  ",
      anthropic: "",
      local: "nope",
      github: "ghp_x",
    }),
    { router: "sk-or-1" },
  );
  assert.deepEqual(sanitizeProviderKeys({ router: "x".repeat(501) }), {});
  assert.deepEqual(sanitizeProviderKeys(null), {});
  assert.deepEqual(sanitizeProviderKeys("sk"), {});
});
