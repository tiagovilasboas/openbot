import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkBodySize } from "../server-guard/check-body-size.ts";

// /api/keys has no guard of its own: proxy.ts runs the request guard (origin,
// access token, rate limit, body cap) on every /api/* path, so pin that the
// matcher still spans it and that the route keeps its three methods.
test("the proxy matcher covers /api/keys", () => {
  const proxy = readFileSync(
    new URL("../../proxy.ts", import.meta.url),
    "utf8",
  );
  assert.match(proxy, /matcher:\s*\[\s*"\/api\/:path\*"/);
});

test("the keys route exports GET, PUT and DELETE and stays thin", () => {
  const route = readFileSync(
    new URL("../../app/api/keys/route.ts", import.meta.url),
    "utf8",
  );
  for (const method of ["GET", "PUT", "DELETE"]) {
    assert.match(route, new RegExp(`export const ${method} =`));
  }
  assert.ok(route.split("\n").length < 30);
});

test("the guard's body cap refuses oversized key uploads", () => {
  const decision = checkBodySize(
    new Headers({ "content-length": String(1024 * 1024) }),
  );
  assert.equal(decision.ok, false);
});
