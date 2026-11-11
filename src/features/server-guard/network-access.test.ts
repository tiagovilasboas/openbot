import assert from "node:assert/strict";
import test from "node:test";
import { clientAddress } from "./client-address.ts";
import { createRequestGuard } from "./guard-request.ts";
import { isLoopbackAddress } from "./loopback-address.ts";

const LAN = "192.168.1.20";

/** What proxy.ts does: Next writes the socket address into X-Forwarded-For. */
function request(
  socketAddress: string | undefined,
  extra: Record<string, string> = {},
) {
  const headers = new Headers({
    host: "localhost:3000",
    "x-openbot-client": "1",
    ...extra,
  });
  if (socketAddress && !headers.has("x-forwarded-for")) {
    headers.set("x-forwarded-for", socketAddress);
  }
  return headers;
}

function run(
  env: Record<string, string | undefined>,
  headers: Headers,
  method = "POST",
) {
  const guard = createRequestGuard(env);
  return guard({
    method,
    headers,
    ip: "shared",
    address: clientAddress(headers, env),
  });
}

test("loopback addresses are recognised, everything else is not", () => {
  for (const ok of [
    "127.0.0.1",
    "127.255.255.254",
    "::1",
    "::ffff:127.0.0.1",
    "::FFFF:127.1.2.3",
  ]) {
    assert.equal(isLoopbackAddress(ok), true, ok);
  }
  for (const bad of [
    undefined,
    "",
    "192.168.1.20",
    "10.0.0.1",
    "128.0.0.1",
    "127.0.0.256",
    "127.0.0.1:3000",
    "localhost",
    "::2",
    "::ffff:192.168.1.20",
    "fe80::1%en0",
    "0127.0.0.1x",
  ]) {
    assert.equal(isLoopbackAddress(bad), false, String(bad));
  }
});

test("a local browser on localhost:3000 is loopback with no token", () => {
  // Next fills X-Forwarded-For from the socket: IPv4, IPv6 or IPv4-mapped.
  for (const socket of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
    assert.deepEqual(run({}, request(socket)), { ok: true }, socket);
    assert.deepEqual(run({}, request(socket), "GET"), { ok: true }, socket);
  }
});

test("a LAN client without a token is refused with a stable 403 code", () => {
  const result = run({}, request(LAN));
  assert.deepEqual(result, {
    ok: false,
    status: 403,
    error: "access_token_required",
  });
});

test("an empty OPENBOT_ACCESS_TOKEN counts as not set", () => {
  const result = run({ OPENBOT_ACCESS_TOKEN: "" }, request(LAN));
  assert.equal(!result.ok && result.error, "access_token_required");
});

test("a LAN client with the right token is allowed", () => {
  const env = { OPENBOT_ACCESS_TOKEN: "s3cret" };
  const headers = request(LAN, { authorization: "Bearer s3cret" });
  assert.deepEqual(run(env, headers), { ok: true });
});

test("a LAN client with a wrong or missing token is refused as before", () => {
  const env = { OPENBOT_ACCESS_TOKEN: "s3cret" };
  const wrong = run(env, request(LAN, { authorization: "Bearer nope" }));
  assert.equal(!wrong.ok && wrong.status, 401);
  assert.equal(!wrong.ok && wrong.error, "unauthorized");
  const missing = run(env, request(LAN));
  assert.equal(!missing.ok && missing.error, "unauthorized");
});

test("loopback with a token set still needs the token", () => {
  const result = run({ OPENBOT_ACCESS_TOKEN: "s3cret" }, request("127.0.0.1"));
  assert.equal(!result.ok && result.status, 401);
});

test("an unknown address is refused when no token is set", () => {
  const result = run({}, request(undefined));
  assert.equal(!result.ok && result.error, "access_token_required");
  assert.equal(!result.ok && result.status, 403);
});

test("without a trusted proxy a multi-hop header is unknown, so refused", () => {
  const headers = request(undefined, {
    "x-forwarded-for": "203.0.113.9, 127.0.0.1",
  });
  assert.equal(clientAddress(headers, {}), undefined);
  assert.equal(run({}, headers).ok, false);
});

test("behind a trusted proxy the last hop decides", () => {
  const env = { OPENBOT_TRUST_PROXY: "1" };
  const lan = request(undefined, {
    "x-forwarded-for": "127.0.0.1, 192.168.1.20",
  });
  assert.equal(clientAddress(lan, env), LAN);
  const refused = run(env, lan);
  assert.equal(!refused.ok && refused.error, "access_token_required");
  const local = request(undefined, {
    "x-forwarded-for": "192.168.1.20, 127.0.0.1",
  });
  assert.deepEqual(run(env, local), { ok: true });
});

test("a blank or malformed X-Forwarded-For is unknown", () => {
  for (const value of ["", " ", "127.0.0.1,", ",127.0.0.1"]) {
    const headers = new Headers({ "x-forwarded-for": value });
    assert.equal(clientAddress(headers, {}), undefined, value);
    assert.equal(
      clientAddress(headers, { OPENBOT_TRUST_PROXY: "1" }),
      undefined,
      value,
    );
  }
});
