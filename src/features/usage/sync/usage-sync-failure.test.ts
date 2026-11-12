import assert from "node:assert/strict";
import test from "node:test";
import { USAGE_STORAGE_KEY } from "../usage-storage.ts";
import { USAGE_UNSYNCED_KEY } from "./local-usage-port.ts";
import { usageSyncErrorCode, usageSyncMessage } from "./usage-sync-failure.ts";

test("network and server errors stay quiet", () => {
  assert.equal(usageSyncErrorCode({ kind: "network" }), null);
  assert.equal(usageSyncErrorCode({ kind: "http", status: 500 }), null);
});

test("refusals map to their codes", () => {
  assert.equal(
    usageSyncErrorCode({
      kind: "http",
      status: 400,
      error: "too_many_records",
    }),
    "too_large",
  );
  assert.equal(usageSyncErrorCode({ kind: "http", status: 413 }), "too_large");
  assert.equal(
    usageSyncErrorCode({ kind: "http", status: 401 }),
    "unauthorized",
  );
  assert.equal(usageSyncErrorCode({ kind: "http", status: 400 }), "rejected");
});

test("every code has copy in every language", () => {
  for (const language of ["pt", "en", "es"] as const) {
    for (const code of ["too_large", "unauthorized", "rejected"] as const) {
      assert.ok(usageSyncMessage(language, code).length > 0);
    }
  }
});

test("the unsynced flag key is not under the usage log's prefix", () => {
  assert.ok(!USAGE_UNSYNCED_KEY.startsWith(USAGE_STORAGE_KEY));
});
