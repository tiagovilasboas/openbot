import assert from "node:assert/strict";
import test from "node:test";

import type { MessageData } from "../chat/ChatMessageItem.tsx";
import { lastReplyFailed, needsYouItems } from "./needs-you.ts";
import { needsYouReasonLabel } from "./needs-you-copy.ts";

const bots = [{ id: "chief" }, { id: "dev" }, { id: "ops" }];
const base = {
  bots,
  activeBotId: "chief",
  failedBotIds: new Set<string>(),
  attentionCounts: {},
};

const message = (over: Partial<MessageData>): MessageData => ({
  id: 1,
  language: "en",
  role: "assistant",
  text: "x",
  ...over,
});

test("nothing is waiting: the list is empty", () => {
  assert.deepEqual(needsYouItems(base), []);
});

test("an approval, a failed reply and unread replies are listed in order", () => {
  const items = needsYouItems({
    ...base,
    approvalBotId: "ops",
    failedBotIds: new Set(["dev"]),
    attentionCounts: { dev: 2, ops: 1 },
  });
  assert.deepEqual(items, [
    { botId: "dev", reason: "failed" },
    { botId: "ops", reason: "approval" },
  ]);
});

test("unread replies list an agent with their count", () => {
  assert.deepEqual(needsYouItems({ ...base, attentionCounts: { dev: 3 } }), [
    { botId: "dev", reason: "unread", count: 3 },
  ]);
});

test("the open agent only counts for a pending approval", () => {
  const open = {
    ...base,
    failedBotIds: new Set(["chief"]),
    attentionCounts: { chief: 1 },
  };
  assert.deepEqual(needsYouItems(open), []);
  assert.deepEqual(needsYouItems({ ...open, approvalBotId: "chief" }), [
    { botId: "chief", reason: "approval" },
  ]);
});

test("ids that are not in the visible list are ignored", () => {
  assert.deepEqual(
    needsYouItems({
      ...base,
      approvalBotId: "gone",
      failedBotIds: new Set(["gone"]),
      attentionCounts: { gone: 4 },
    }),
    [],
  );
});

test("only an interrupted last reply counts as failed", () => {
  assert.equal(lastReplyFailed([]), false);
  assert.equal(lastReplyFailed([message({ incomplete: "error" })]), true);
  assert.equal(lastReplyFailed([message({ incomplete: "cancelled" })]), false);
  assert.equal(lastReplyFailed([message({ incomplete: "too_long" })]), false);
  assert.equal(
    lastReplyFailed([
      message({ incomplete: "error" }),
      message({ id: 2, role: "user" }),
    ]),
    false,
  );
});

test("every reason has a label in each language", () => {
  for (const language of ["pt", "en", "es"] as const) {
    for (const item of [
      { botId: "a", reason: "approval" as const },
      { botId: "a", reason: "failed" as const },
      { botId: "a", reason: "unread" as const, count: 2 },
    ]) {
      assert.ok(needsYouReasonLabel(language, item).length > 0);
    }
  }
});
