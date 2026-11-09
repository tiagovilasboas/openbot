import assert from "node:assert/strict";
import test from "node:test";
import type { MessageData } from "./ChatMessageItem.tsx";
import { insertReplyAfter, threadUpTo } from "./thread-sequencing.ts";

const msg = (id: number, role: "user" | "assistant"): MessageData => ({
  id,
  role,
  language: "en",
  text: `${role}-${id}`,
});

test("a reply lands after its user message and keeps the queued one", () => {
  const thread = [msg(1, "user"), msg(2, "user")];
  const next = insertReplyAfter(thread, 1, [msg(3, "assistant")]);
  assert.deepEqual(
    next.map((m) => m.id),
    [1, 3, 2],
  );
});

test("the queued turn is sent with its user message last", () => {
  const afterFirst = insertReplyAfter(
    [msg(1, "user"), msg(2, "user"), msg(3, "user")],
    1,
    [msg(4, "assistant")],
  );
  const sent = threadUpTo(afterFirst, 2);
  assert.deepEqual(
    sent.map((m) => m.id),
    [1, 4, 2],
  );
  assert.equal(sent.at(-1)?.role, "user");
  const afterSecond = insertReplyAfter(afterFirst, 2, [msg(5, "assistant")]);
  assert.deepEqual(
    afterSecond.map((m) => m.id),
    [1, 4, 2, 5, 3],
  );
});
