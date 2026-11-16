import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTIONS, findConnection } from "./connection-catalog.ts";

test("every connection has a key link on https", () => {
  for (const entry of CONNECTIONS) {
    assert.ok(entry.keyUrl.startsWith("https://"), entry.id);
    assert.equal(findConnection(entry.id), entry);
  }
});
