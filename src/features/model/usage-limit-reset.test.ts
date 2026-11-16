import assert from "node:assert/strict";
import test from "node:test";
import { classifyModelFailure } from "./classify-model-failure.ts";
import { providerErrorDetail } from "./provider-error-detail.ts";
import {
  failoverInfoFor,
  resetSecondsFromHeaders,
  resetSecondsOfDetail,
  stripResetTag,
} from "./usage-limit-reset.ts";

const NOW = Date.parse("2026-11-16T12:00:00Z");

function headers(init: Record<string, string>) {
  return new Headers(init);
}

test("retry-after seconds and HTTP dates become seconds to wait", () => {
  assert.equal(
    resetSecondsFromHeaders(headers({ "retry-after": "120" }), NOW),
    120,
  );
  assert.equal(
    resetSecondsFromHeaders(
      headers({ "retry-after": "Mon, 16 Nov 2026 12:05:00 GMT" }),
      NOW,
    ),
    300,
  );
});

test("reset headers in epoch seconds, epoch ms and RFC 3339 are read", () => {
  const at = NOW / 1000 + 90;
  assert.equal(
    resetSecondsFromHeaders(headers({ "x-ratelimit-reset": String(at) }), NOW),
    90,
  );
  assert.equal(
    resetSecondsFromHeaders(
      headers({ "x-ratelimit-reset": String(at * 1000) }),
      NOW,
    ),
    90,
  );
  assert.equal(
    resetSecondsFromHeaders(
      headers({ "anthropic-ratelimit-tokens-reset": "2026-11-16T12:01:00Z" }),
      NOW,
    ),
    60,
  );
});

test("a missing, past, absurd or malformed reset is ignored", () => {
  assert.equal(resetSecondsFromHeaders(headers({}), NOW), undefined);
  assert.equal(resetSecondsFromHeaders(undefined, NOW), undefined);
  assert.equal(
    resetSecondsFromHeaders(headers({ "retry-after": "0" }), NOW),
    undefined,
  );
  assert.equal(
    resetSecondsFromHeaders(headers({ "retry-after": "99999999" }), NOW),
    undefined,
  );
  assert.equal(
    resetSecondsFromHeaders(headers({ "retry-after": "soon" }), NOW),
    undefined,
  );
});

test("only a 429 carries the reset in its detail, and it classifies", () => {
  const limited = providerErrorDetail(
    429,
    "slow down",
    headers({ "retry-after": "45" }),
  );
  assert.equal(limited, "429: rate_limited reset=45");
  assert.equal(resetSecondsOfDetail(limited), 45);
  assert.equal(stripResetTag(limited), "429: rate_limited");
  assert.deepEqual(classifyModelFailure("provider_rejected", limited), {
    kind: "rate_limit",
    status: 429,
    resetSeconds: 45,
  });
  assert.equal(
    providerErrorDetail(500, null, headers({ "retry-after": "45" })),
    "500: upstream_error",
  );
  assert.equal(providerErrorDetail(429), "429: rate_limited");
});

test("the failover note keeps the reason clean and the reset apart", () => {
  assert.deepEqual(failoverInfoFor("a", "b", "429: rate_limited reset=60"), {
    fromModel: "a",
    toModel: "b",
    reason: "429: rate_limited",
    resetSeconds: 60,
  });
  assert.deepEqual(failoverInfoFor("a", "b", "502"), {
    fromModel: "a",
    toModel: "b",
    reason: "502",
  });
});
