import assert from "node:assert/strict";
import test from "node:test";
import { classifyModelFailure } from "./classify-model-failure.ts";
import { providerErrorDetail } from "./provider-error-detail.ts";

test("known statuses map to a fixed tag", () => {
  assert.equal(providerErrorDetail(401, "anything"), "401: unauthorized");
  assert.equal(providerErrorDetail(403), "403: forbidden");
  assert.equal(providerErrorDetail(404), "404: not_found");
  assert.equal(providerErrorDetail(429), "429: rate_limited");
  assert.equal(providerErrorDetail(503, "boom"), "503: upstream_error");
  assert.equal(providerErrorDetail(418, "teapot"), "HTTP 418");
});

test("upstream free text never reaches the detail", () => {
  for (const status of [400, 401, 403, 404, 429, 500, 418]) {
    const detail = providerErrorDetail(status, "secret sk-123 http://10.0.0.1");
    assert.ok(!/sk-123|10\.0\.0\.1|secret/.test(detail), detail);
    assert.ok(detail.length <= 24);
  }
});

test("400 distinguishes a bad model without echoing the message", () => {
  assert.equal(
    providerErrorDetail(400, "not a valid model ID"),
    "400: invalid_model",
  );
  assert.equal(providerErrorDetail(400, "bad json"), "400: bad_request");
});

test("the failure classifier still understands the sanitized details", () => {
  const kind = (detail: string) =>
    classifyModelFailure("provider_rejected", detail).kind;
  assert.equal(kind(providerErrorDetail(401)), "auth");
  assert.equal(kind(providerErrorDetail(429)), "rate_limit");
  assert.equal(kind(providerErrorDetail(404)), "model_unavailable");
  assert.equal(
    kind(providerErrorDetail(400, "invalid model")),
    "model_unavailable",
  );
  assert.equal(kind(providerErrorDetail(400, "bad json")), "unknown");
});

test("a blocked base URL has its own failure kind", () => {
  assert.deepEqual(classifyModelFailure("blocked_base_url", undefined), {
    kind: "blocked_url",
  });
});
