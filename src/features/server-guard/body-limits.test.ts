import assert from "node:assert/strict";
import test from "node:test";
import {
  BOTS_BODY_MAX_BYTES,
  DEFAULT_BODY_MAX_BYTES,
  bodyLimitFor,
  readBodyWithCap,
} from "./body-limits.ts";
import { createRequestGuard } from "./guard-request.ts";

const MB = 1024 * 1024;

function put(path: string, length: number, method = "PUT") {
  return {
    method,
    path,
    headers: new Headers({
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "content-length": String(length),
    }),
    ip: "1.1.1.1",
    address: "127.0.0.1",
  };
}

test("PUT /api/conversations gets an 8 MB cap, other methods the default", () => {
  assert.equal(bodyLimitFor("PUT", "/api/conversations"), 8 * MB);
  assert.equal(
    bodyLimitFor("GET", "/api/conversations"),
    DEFAULT_BODY_MAX_BYTES,
  );
  assert.equal(
    bodyLimitFor("DELETE", "/api/conversations"),
    DEFAULT_BODY_MAX_BYTES,
  );
});

test("only PUT /api/bots gets the larger cap", () => {
  assert.equal(bodyLimitFor("PUT", "/api/bots"), 2 * MB);
  assert.equal(bodyLimitFor("put", "/api/bots/"), 2 * MB);
  assert.equal(bodyLimitFor("GET", "/api/bots"), DEFAULT_BODY_MAX_BYTES);
  assert.equal(bodyLimitFor("POST", "/api/chat"), DEFAULT_BODY_MAX_BYTES);
  assert.equal(bodyLimitFor("PUT", "/api/other"), DEFAULT_BODY_MAX_BYTES);
  assert.equal(bodyLimitFor("POST"), DEFAULT_BODY_MAX_BYTES);
  assert.equal(bodyLimitFor("PUT", "/api/constructor"), DEFAULT_BODY_MAX_BYTES);
});

test("the guard keeps 64 KB elsewhere and accepts ~1 MB on PUT /api/bots", () => {
  const guard = createRequestGuard({});
  assert.deepEqual(guard(put("/api/chat", 64 * 1024, "POST")), { ok: true });
  assert.equal(guard(put("/api/chat", 64 * 1024 + 1, "POST")).ok, false);
  assert.equal(guard(put("/api/bots", MB, "POST")).ok, false);
  assert.deepEqual(guard(put("/api/bots", MB)), { ok: true });
  assert.deepEqual(guard(put("/api/bots", BOTS_BODY_MAX_BYTES)), { ok: true });
});

test("the guard refuses more than 2 MB on PUT /api/bots with 413", () => {
  const decision = createRequestGuard({})(
    put("/api/bots", BOTS_BODY_MAX_BYTES + 1),
  );
  assert.deepEqual(decision, {
    ok: false,
    status: 413,
    error: "payload_too_large",
  });
});

test("readBodyWithCap reads within the cap and refuses beyond it", async () => {
  const req = (body: string) =>
    new Request("http://localhost/x", { method: "PUT", body });
  assert.equal(await readBodyWithCap(req("héllo"), 100), "héllo");
  assert.equal(await readBodyWithCap(req("x".repeat(101)), 100), null);
  const declared = new Request("http://localhost/x", {
    method: "PUT",
    body: "x",
    headers: { "content-length": "999" },
  });
  assert.equal(await readBodyWithCap(declared, 100), null);
});
