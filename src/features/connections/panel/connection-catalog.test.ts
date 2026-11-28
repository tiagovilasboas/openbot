import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTIONS, findConnection } from "./connection-catalog.ts";

test("every connection resolves and API-key connections have an https key link", () => {
  for (const entry of CONNECTIONS) {
    if (entry.id !== "chatgpt") {
      assert.ok(entry.keyUrl?.startsWith("https://"), entry.id);
    }
    assert.equal(findConnection(entry.id), entry);
  }
  assert.equal(findConnection("chatgpt").name, "ChatGPT");
});
