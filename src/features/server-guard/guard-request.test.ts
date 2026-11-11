import assert from "node:assert/strict";
import test from "node:test";
import { safeEqual } from "./check-access-token.ts";
import { checkBodySize } from "./check-body-size.ts";
import { createRequestGuard } from "./guard-request.ts";
import { createRateLimiter, parseRateLimit } from "./rate-limiter.ts";

function post(headers: Record<string, string>, ip = "1.1.1.1") {
  return {
    method: "POST",
    headers: new Headers({ host: "localhost:3000", ...headers }),
    ip,
    address: "127.0.0.1",
  };
}

const sameOrigin = { origin: "http://localhost:3000" };
const clientOnly = { "x-openbot-client": "1" };

test("localhost works with zero configuration", () => {
  const guard = createRequestGuard({});
  assert.deepEqual(guard(post({ ...sameOrigin, "content-length": "20" })), {
    ok: true,
  });
  assert.deepEqual(guard(post(clientOnly)), { ok: true });
  assert.deepEqual(guard({ ...post(clientOnly), method: "GET" }), { ok: true });
});

test("a cross-site Origin is refused even with the client header", () => {
  const guard = createRequestGuard({});
  for (const origin of ["https://evil.example", "null", "not a url"]) {
    const result = guard(post({ origin, ...clientOnly }));
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 403);
    assert.equal(!result.ok && result.error, "forbidden_origin");
  }
});

test("a request with neither Origin nor the client header is refused", () => {
  const result = createRequestGuard({})(post({}));
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error, "missing_client_header");
  assert.equal(!result.ok && result.status, 403);
});

test("body size: over 64 KB or undeclared chunked bodies get 413", () => {
  const guard = createRequestGuard({});
  const big = guard(post({ ...clientOnly, "content-length": "65537" }));
  assert.equal(!big.ok && big.status, 413);
  const chunked = guard(
    post({ ...clientOnly, "transfer-encoding": "chunked" }),
  );
  assert.equal(!chunked.ok && chunked.status, 413);
  const edge = guard(post({ ...clientOnly, "content-length": "65536" }));
  assert.equal(edge.ok, true);
  assert.equal(
    checkBodySize(new Headers({ "content-length": "abc" })).ok,
    false,
  );
});

test("rate limit: the 61st request in a minute gets 429 with Retry-After", () => {
  let time = 1_000_000;
  const guard = createRequestGuard({}, () => time);
  for (let i = 0; i < 60; i++) {
    assert.equal(guard(post(clientOnly)).ok, true);
    time += 100;
  }
  const refused = guard(post(clientOnly));
  assert.equal(!refused.ok && refused.status, 429);
  assert.equal(!refused.ok && refused.error, "rate_limited");
  const wait = !refused.ok && refused.retryAfterSeconds;
  assert.ok(typeof wait === "number" && wait >= 1 && wait <= 60);
  assert.equal(guard(post(clientOnly, "2.2.2.2")).ok, true);
  time += 60_000;
  assert.equal(guard(post(clientOnly)).ok, true);
});

test("rate limit is configurable and invalid values fall back to 60", () => {
  assert.equal(parseRateLimit("5"), 5);
  for (const bad of [undefined, "", "0", "-3", "abc", "2.5"]) {
    assert.equal(parseRateLimit(bad), 60);
  }
  const guard = createRequestGuard({ OPENBOT_RATE_LIMIT: "2" });
  assert.equal(guard(post(clientOnly)).ok, true);
  assert.equal(guard(post(clientOnly)).ok, true);
  assert.equal(guard(post(clientOnly)).ok, false);
});

test("refused requests do not spend the rate budget", () => {
  const guard = createRequestGuard({ OPENBOT_RATE_LIMIT: "1" });
  for (let i = 0; i < 5; i++) guard(post({}));
  assert.equal(guard(post(clientOnly)).ok, true);
});

test("access token: unset is open, set requires the exact Bearer token", () => {
  const open = createRequestGuard({});
  assert.equal(open(post(clientOnly)).ok, true);

  const guard = createRequestGuard({ OPENBOT_ACCESS_TOKEN: "s3cret" });
  const missing = guard(post(clientOnly));
  assert.equal(!missing.ok && missing.status, 401);
  const wrong = guard(post({ ...clientOnly, authorization: "Bearer nope" }));
  assert.equal(!wrong.ok && wrong.error, "unauthorized");
  const prefix = guard(post({ ...clientOnly, authorization: "Bearer s3cre" }));
  assert.equal(prefix.ok, false);
  const basic = guard(post({ ...clientOnly, authorization: "Basic s3cret" }));
  assert.equal(basic.ok, false);
  const good = guard(post({ ...clientOnly, authorization: "Bearer s3cret" }));
  assert.equal(good.ok, true);
});

test("safeEqual compares in constant time over equal-length buffers", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(safeEqual("", ""), true);
  assert.equal(safeEqual("", "a"), false);
});

test("limiter forgets old clients", () => {
  let time = 0;
  const limiter = createRateLimiter(1, () => time);
  assert.equal(limiter.check("a").allowed, true);
  assert.equal(limiter.check("a").allowed, false);
  time = 60_001;
  assert.equal(limiter.check("a").allowed, true);
});
