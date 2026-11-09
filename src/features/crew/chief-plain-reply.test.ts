import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { chiefPlainReply } from "./chief-plain-reply.ts";
import { crewCopy } from "./crew-copy.ts";

const bots = [...CREW_PRESETS];
const CHIEF = "chief-of-staff";

test("a delegation to an unknown bot never reaches the user", () => {
  const text = chiefPlainReply(
    "@delegate Nobody: do something",
    bots,
    CHIEF,
    "en",
  );
  assert.doesNotMatch(text, /@delegate/i);
  assert.equal(text, crewCopy.en.delegateNotFound);
});

test("the fallback sentence follows the language", () => {
  const text = chiefPlainReply("@delegate Ninguem: faça", bots, CHIEF, "pt");
  assert.equal(text, crewCopy.pt.delegateNotFound);
});

test("the Chief's own words stay and only the delegation line goes", () => {
  const text = chiefPlainReply(
    "Let me ask.\n@delegate Nobody: x",
    bots,
    CHIEF,
    "en",
  );
  assert.equal(text, "Let me ask.");
});

test("a plain reply is returned untouched", () => {
  assert.equal(
    chiefPlainReply("Hello there", bots, CHIEF, "en"),
    "Hello there",
  );
});
