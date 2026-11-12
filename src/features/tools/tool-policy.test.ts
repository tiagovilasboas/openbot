import assert from "node:assert/strict";
import test from "node:test";
import { policyFor } from "./tool-policy.ts";

const grants = [{ botId: "b1", toolName: "memory.add_note" }];
const ask = (allowAlways: boolean) => ({
  name: "memory.add_note",
  policy: "ask" as const,
  allowAlways,
});

test("auto tools stay auto", () => {
  assert.equal(
    policyFor({ name: "x", policy: "auto", allowAlways: false }, "b1", []),
    "auto",
  );
});

test("ask tools without a grant ask", () => {
  assert.equal(policyFor(ask(true), "b1", []), "ask");
});

test("an always grant applies for the same bot and tool", () => {
  assert.equal(policyFor(ask(true), "b1", grants), "auto");
});

test("a grant never applies to another bot or tool", () => {
  assert.equal(policyFor(ask(true), "b2", grants), "ask");
  assert.equal(policyFor({ ...ask(true), name: "other" }, "b1", grants), "ask");
});

test("a grant is ignored when the tool does not allow always", () => {
  assert.equal(policyFor(ask(false), "b1", grants), "ask");
});
