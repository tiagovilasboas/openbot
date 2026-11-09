import assert from "node:assert/strict";
import test from "node:test";
import { withApiHeaders } from "./api-request-init.ts";

test("adds the client header and keeps existing headers and options", () => {
  const init = withApiHeaders(
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
    () => null,
  );
  const headers = new Headers(init.headers);
  assert.equal(headers.get("x-openbot-client"), "1");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.has("authorization"), false);
  assert.equal(init.method, "POST");
  assert.equal(init.body, "{}");
});

test("adds the Bearer token when one is saved", () => {
  const headers = new Headers(withApiHeaders(undefined, () => "tok").headers);
  assert.equal(headers.get("authorization"), "Bearer tok");
  assert.equal(headers.get("x-openbot-client"), "1");
});

test("works without a browser: no localStorage means no token", () => {
  const headers = new Headers(withApiHeaders().headers);
  assert.equal(headers.has("authorization"), false);
});
