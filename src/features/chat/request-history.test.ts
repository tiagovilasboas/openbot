import assert from "node:assert/strict";
import test from "node:test";
import { limitHistory, MAX_HISTORY_MESSAGES } from "./request-history.ts";

function thread(exchanges: number) {
  const out: Array<{ role: "user" | "assistant"; text: string }> = [];
  for (let i = 0; i < exchanges; i++) {
    out.push({ role: "user", text: `u${i}` });
    out.push({ role: "assistant", text: `a${i}` });
  }
  out.push({ role: "user", text: "last" });
  return out;
}

test("long threads are cut to the newest 40, user first and user last", () => {
  const sent = limitHistory(thread(40));
  assert.ok(sent.length <= MAX_HISTORY_MESSAGES);
  assert.equal(sent[0]?.role, "user");
  assert.equal(sent.at(-1)?.text, "last");
});

test("short threads pass through untouched", () => {
  const short = thread(2);
  assert.deepEqual(limitHistory(short), short);
});

test("a window starting on an assistant message drops it", () => {
  const sent = limitHistory(thread(30), 40);
  assert.equal(sent.length, 39);
  assert.equal(sent[0]?.role, "user");
});
