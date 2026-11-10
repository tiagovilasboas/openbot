import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyFetchError,
  classifyModelFailure,
} from "./classify-model-failure.ts";

test("a server error is told apart from being offline", () => {
  assert.deepEqual(classifyModelFailure("provider_rejected", undefined, 502), {
    kind: "server",
    status: 502,
  });
  assert.deepEqual(
    classifyFetchError({ cancelled: false, timedOut: false, online: false }),
    { kind: "offline" },
  );
  assert.deepEqual(
    classifyFetchError({ cancelled: false, timedOut: false, online: true }),
    { kind: "unreachable" },
  );
});

test("a cancel wins over a timeout, which wins over the network state", () => {
  assert.deepEqual(
    classifyFetchError({ cancelled: true, timedOut: true, online: false }),
    { kind: "cancelled" },
  );
  assert.deepEqual(
    classifyFetchError({ cancelled: false, timedOut: true, online: false }),
    { kind: "timeout" },
  );
});

test("network_error from the test route is unreachable, not unknown", () => {
  assert.deepEqual(classifyModelFailure("network_error", undefined), {
    kind: "unreachable",
  });
});

test("a missing or rejected key is an auth failure", () => {
  assert.deepEqual(
    classifyModelFailure(
      "provider_rejected",
      "401: No cookie auth credentials found",
    ),
    { kind: "auth", status: 401 },
  );
  assert.deepEqual(classifyModelFailure("provider_rejected", "HTTP 403"), {
    kind: "auth",
    status: 403,
  });
});

test("429 is a rate limit", () => {
  assert.deepEqual(
    classifyModelFailure("provider_rejected", "429: Rate limit exceeded"),
    { kind: "rate_limit", status: 429 },
  );
});

test("a model the provider no longer serves is unavailable", () => {
  assert.deepEqual(
    classifyModelFailure("provider_rejected", "404: No endpoints found"),
    { kind: "model_unavailable", status: 404 },
  );
  assert.deepEqual(
    classifyModelFailure(
      "provider_rejected",
      "400: foo:free is not a valid model ID",
    ),
    { kind: "model_unavailable", status: 400 },
  );
});

test("network and unknown failures keep the status when there is one", () => {
  assert.deepEqual(classifyModelFailure("provider_unreachable", undefined), {
    kind: "unreachable",
  });
  assert.deepEqual(classifyModelFailure("provider_rejected", "HTTP 502"), {
    kind: "server",
    status: 502,
  });
  assert.deepEqual(classifyModelFailure("provider_rejected", "400: bad"), {
    kind: "unknown",
    status: 400,
  });
  assert.deepEqual(classifyModelFailure(undefined, { not: "text" }), {
    kind: "unknown",
  });
});
