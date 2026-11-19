import assert from "node:assert/strict";
import { test } from "node:test";
import { parseChannelMessage } from "./channels-api.ts";
import { channelErrorText, getChannelsCopy } from "./channels-copy.ts";

test("server messages are kept only when well formed", () => {
  const good = {
    channelId: "c1",
    seq: 1,
    author: { kind: "human" },
    text: "hi",
    createdAt: 5,
  };
  assert.deepEqual(parseChannelMessage(good), good);
  assert.equal(parseChannelMessage({ ...good, seq: "1" }), null);
  assert.equal(parseChannelMessage({ ...good, author: { kind: "x" } }), null);
  assert.equal(parseChannelMessage(null), null);
});

test("every language names the server's channel errors", () => {
  const codes = Object.keys(getChannelsCopy("en").errors).sort();
  for (const language of ["pt", "es"] as const) {
    assert.deepEqual(
      Object.keys(getChannelsCopy(language).errors).sort(),
      codes,
    );
  }
  const copy = getChannelsCopy("en");
  assert.equal(
    channelErrorText(copy, "channel_busy"),
    copy.errors.channel_busy,
  );
  assert.equal(channelErrorText(copy, "something_new"), copy.errors.unknown);
  assert.equal(channelErrorText(copy, "toString"), copy.errors.unknown);
});
