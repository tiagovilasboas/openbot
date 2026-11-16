import assert from "node:assert/strict";
import test from "node:test";

import { connectionsCopy } from "./connections-copy.ts";
import { describeKeyFailure } from "./describe-key-failure.ts";

test("model key failures become sentences, never codes", () => {
  const pt = connectionsCopy.pt;
  assert.equal(
    describeKeyFailure(
      "router",
      { error: "provider_rejected", detail: "401: no auth" },
      "pt",
    ),
    pt.unauthorized,
  );
  assert.equal(
    describeKeyFailure("router", { error: "provider_unreachable" }, "pt"),
    pt.network,
  );
  assert.equal(
    describeKeyFailure("anthropic", { error: "network_error" }, "en"),
    connectionsCopy.en.network,
  );
  assert.equal(
    describeKeyFailure(
      "router",
      { error: "provider_rejected", detail: "HTTP 502" },
      "en",
    ),
    connectionsCopy.en.serverDown,
  );
  assert.equal(
    describeKeyFailure("router", { error: "something_new" }, "pt"),
    pt.unknown,
  );
});

test("GitHub failures map their own codes and fall back to a sentence", () => {
  const en = connectionsCopy.en;
  assert.equal(
    describeKeyFailure("github", { error: "unauthorized" }, "en"),
    en.unauthorized,
  );
  assert.equal(
    describeKeyFailure("github", { error: "rate_limited" }, "en"),
    en.rateLimited,
  );
  assert.equal(
    describeKeyFailure("github", { error: "repo_not_found" }, "en"),
    en.unknown,
  );
});
