import assert from "node:assert/strict";
import test from "node:test";
import { connectionsCopy } from "./connections-copy.ts";

test("the saved key status says it lives on the Open Bot server", () => {
  assert.match(connectionsCopy.pt.keyStatusSaved, /servidor/);
  assert.match(connectionsCopy.en.keyStatusSaved, /server/);
  assert.match(connectionsCopy.es.keyStatusSaved, /servidor/);
  for (const copy of Object.values(connectionsCopy)) {
    assert.doesNotMatch(copy.keyStatusSaved, /aparelho|device|dispositivo/);
  }
});

test("a failed disconnect has copy in every language", () => {
  for (const copy of Object.values(connectionsCopy)) {
    assert.match(copy.disconnectFailed, /\{name\}/);
  }
});
