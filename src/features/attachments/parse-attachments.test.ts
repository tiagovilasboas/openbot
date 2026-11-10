import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ATTACHMENTS,
  MAX_NAME_LENGTH,
  MAX_TOTAL_CHARS,
} from "./attachment-limits.ts";
import { parseAttachments } from "./parse-attachments.ts";
import {
  RESERVED_REQUEST_BYTES,
  historyByteBudget,
  jsonBytes,
  messageFitsRequest,
} from "./request-size.ts";
import { MAX_BODY_BYTES } from "../server-guard/check-body-size.ts";

const file = (name = "a.txt", text = "hello") => ({ name, text });

test("no attachments field is fine and means none", () => {
  assert.deepEqual(parseAttachments(undefined), { ok: true, attachments: [] });
  assert.deepEqual(parseAttachments([]), { ok: true, attachments: [] });
});

test("valid files pass and only name and text are kept", () => {
  const parsed = parseAttachments([{ ...file(), extra: "x", size: 5 }]);
  assert.deepEqual(parsed, { ok: true, attachments: [file()] });
});

test("a bad shape rejects the request", () => {
  for (const bad of [
    null,
    "text",
    {},
    [null],
    ["a.txt"],
    [{ name: "a.txt" }],
    [{ text: "x" }],
    [{ name: 1, text: "x" }],
    [{ name: "a.txt", text: 7 }],
    [{ name: "  ", text: "x" }],
    [{ name: "a.txt", text: "   " }],
  ]) {
    assert.deepEqual(parseAttachments(bad), { ok: false }, JSON.stringify(bad));
  }
});

test("more than three files is rejected", () => {
  const four = Array.from({ length: MAX_ATTACHMENTS + 1 }, () => file());
  assert.deepEqual(parseAttachments(four), { ok: false });
  assert.equal(parseAttachments(four.slice(0, MAX_ATTACHMENTS)).ok, true);
});

test("a long name or long text is rejected", () => {
  assert.equal(parseAttachments([file("n".repeat(MAX_NAME_LENGTH))]).ok, true);
  assert.equal(
    parseAttachments([file("n".repeat(MAX_NAME_LENGTH + 1))]).ok,
    false,
  );
  assert.equal(
    parseAttachments([file("a", "t".repeat(MAX_TOTAL_CHARS))]).ok,
    true,
  );
  assert.equal(
    parseAttachments([file("a", "t".repeat(MAX_TOTAL_CHARS + 1))]).ok,
    false,
  );
});

test("the total budget holds across files", () => {
  const half = "t".repeat(MAX_TOTAL_CHARS / 2);
  assert.equal(parseAttachments([file("a", half), file("b", half)]).ok, true);
  assert.equal(
    parseAttachments([file("a", half), file("b", half), file("c", "x")]).ok,
    false,
  );
});

test("a full set of files still leaves room for a conversation", () => {
  // Three-byte characters are the worst case a UTF-8 text file can send.
  const worst = [file("w.txt", "€".repeat(MAX_TOTAL_CHARS))];
  const budget = historyByteBudget(worst);
  assert.ok(budget > 4000, `history budget ${budget}`);
  assert.ok(
    budget + RESERVED_REQUEST_BYTES + jsonBytes(worst) <= MAX_BODY_BYTES,
  );
});

test("a message too big next to its files does not fit the request", () => {
  const worst = [file("w.txt", "€".repeat(MAX_TOTAL_CHARS))];
  assert.equal(messageFitsRequest("a short question", worst), true);
  assert.equal(messageFitsRequest("€".repeat(4000), worst), false);
  assert.equal(messageFitsRequest("x".repeat(30000), []), true);
});
