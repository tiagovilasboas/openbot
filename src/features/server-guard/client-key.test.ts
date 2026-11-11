import assert from "node:assert/strict";
import test from "node:test";
import { clientKey, SHARED_CLIENT_KEY } from "./client-key.ts";
import { createRequestGuard } from "./guard-request.ts";
import { createRateLimiter } from "./rate-limiter.ts";

function withForwarded(value: string): Headers {
  return new Headers({ "x-forwarded-for": value });
}

test("without the proxy flag every caller shares one key, whatever the header says", () => {
  for (const env of [
    {},
    { OPENBOT_TRUST_PROXY: "0" },
    { OPENBOT_TRUST_PROXY: "true" },
  ]) {
    assert.equal(clientKey(withForwarded("9.9.9.9"), env), SHARED_CLIENT_KEY);
    assert.equal(clientKey(new Headers(), env), SHARED_CLIENT_KEY);
  }
});

test("rotating X-Forwarded-For does not dodge the rate limit", () => {
  const guard = createRequestGuard({ OPENBOT_RATE_LIMIT: "3" });
  const env = {};
  const results = Array.from({ length: 6 }, (_, i) =>
    guard({
      method: "POST",
      headers: new Headers({
        host: "localhost:3000",
        "x-openbot-client": "1",
        "x-forwarded-for": `203.0.113.${i}`,
      }),
      ip: clientKey(withForwarded(`203.0.113.${i}`), env),
      // A local caller: this test is about the limiter, not the token gate.
      address: "127.0.0.1",
    }),
  );
  assert.deepEqual(
    results.map((result) => result.ok),
    [true, true, true, false, false, false],
  );
});

test("with OPENBOT_TRUST_PROXY=1 the key is the hop the proxy appended", () => {
  const env = { OPENBOT_TRUST_PROXY: "1" };
  assert.equal(clientKey(withForwarded("198.51.100.7"), env), "198.51.100.7");
  // The caller wrote the first hops; only the last one is the proxy's.
  assert.equal(
    clientKey(withForwarded("1.2.3.4, 5.6.7.8, 198.51.100.7"), env),
    "198.51.100.7",
  );
  assert.equal(
    clientKey(withForwarded("1.2.3.4,198.51.100.7 "), env),
    "198.51.100.7",
  );
});

test("a trusted but missing, empty or oversized header falls back to the shared key", () => {
  const env = { OPENBOT_TRUST_PROXY: "1" };
  assert.equal(clientKey(new Headers(), env), SHARED_CLIENT_KEY);
  assert.equal(clientKey(withForwarded(""), env), SHARED_CLIENT_KEY);
  assert.equal(clientKey(withForwarded("a, "), env), SHARED_CLIENT_KEY);
  assert.equal(
    clientKey(withForwarded("x".repeat(500)), env),
    SHARED_CLIENT_KEY,
  );
});

test("rotating keys cannot grow the limiter past its cap", () => {
  const time = 1_000;
  const limiter = createRateLimiter(5, () => time, 50);
  for (let i = 0; i < 5_000; i++) limiter.check(`10.0.${i >> 8}.${i & 255}`);
  assert.ok(
    limiter.trackedClients() <= 50,
    `tracked ${limiter.trackedClients()} keys`,
  );
});

test("when the cap is hit the least recently seen key is evicted first", () => {
  const time = 1_000;
  const limiter = createRateLimiter(1, () => time, 3);
  assert.equal(limiter.check("old").allowed, true);
  assert.equal(limiter.check("b").allowed, true);
  assert.equal(limiter.check("c").allowed, true);
  // "old" is touched again, so "b" is now the oldest.
  assert.equal(limiter.check("old").allowed, false);
  assert.equal(limiter.check("d").allowed, true);
  assert.equal(limiter.trackedClients(), 3);
  assert.equal(limiter.check("old").allowed, false, "recent key kept");
  assert.equal(limiter.check("b").allowed, true, "oldest key was evicted");
});
