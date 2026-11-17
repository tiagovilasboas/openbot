import assert from "node:assert/strict";
import test from "node:test";
import { canAllow, decideTool, isToolLevel, policyFor } from "./tool-policy.ts";

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

const note = ask(true);
const lookup = { name: "lookup", policy: "auto" as const, allowAlways: false };
const strict = { name: "send", policy: "ask" as const, allowAlways: false };

test("no level means ask, and ask keeps the grant logic", () => {
  assert.equal(decideTool(note, "b1", [], {}), "ask");
  assert.equal(decideTool(note, "b1", grants, {}), "auto");
  assert.equal(decideTool(note, "b1", [], { [note.name]: "ask" }), "ask");
});

test("block wins over a grant and over an auto tool", () => {
  assert.equal(
    decideTool(note, "b1", grants, { [note.name]: "block" }),
    "block",
  );
  assert.equal(decideTool(lookup, "b1", [], { lookup: "block" }), "block");
});

test("allow runs a tool that opts in with allowAlways, for every bot", () => {
  assert.equal(decideTool(note, "b9", [], { [note.name]: "allow" }), "auto");
});

test("allow never weakens a tool without allowAlways", () => {
  assert.equal(decideTool(strict, "b1", [], { send: "allow" }), "ask");
  assert.equal(canAllow(strict), false);
  assert.equal(canAllow(note), true);
});

test("a level for another tool, or an inherited key, changes nothing", () => {
  assert.equal(decideTool(note, "b1", [], { other: "block" }), "ask");
  const inherited = {
    name: "constructor",
    policy: "ask" as const,
    allowAlways: true,
  };
  assert.equal(decideTool(inherited, "b1", [], {}), "ask");
});

test("isToolLevel accepts only the three levels", () => {
  assert.equal(isToolLevel("allow"), true);
  assert.equal(isToolLevel("never"), false);
  assert.equal(isToolLevel(undefined), false);
});
