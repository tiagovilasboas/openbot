import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { parseDelegations } from "./parse-delegations.ts";

const bots = [...CREW_PRESETS];
const CHIEF = "chief-of-staff";

test("reads one delegation per line and strips them from the visible text", () => {
  const parsed = parseDelegations(
    "Vou acionar a equipe.\n@delegate Engineering: revise o PR 12\n@delegate Security: avalie o risco",
    bots,
    CHIEF,
  );
  assert.deepEqual(
    parsed.delegations.map((d) => [d.bot.id, d.task]),
    [
      ["engineering", "revise o PR 12"],
      ["security", "avalie o risco"],
    ],
  );
  assert.equal(parsed.visibleText, "Vou acionar a equipe.");
});

test("resolves bots by name, handle or id, case-insensitive", () => {
  const parsed = parseDelegations(
    "@delegate engineering: a\n@delegate @Publishing: b\n@DELEGATE finance: c",
    bots,
    CHIEF,
  );
  assert.deepEqual(
    parsed.delegations.map((d) => d.bot.id),
    ["engineering", "publishing", "finance"],
  );
});

test("tolerates list, bold and code decoration from free models", () => {
  const parsed = parseDelegations(
    "1. **@delegate Engineering:** fix the build\n- `@delegate Security: check secrets`\n* @delegar Product: write the brief",
    bots,
    CHIEF,
  );
  assert.deepEqual(
    parsed.delegations.map((d) => [d.bot.id, d.task]),
    [
      ["engineering", "fix the build"],
      ["security", "check secrets"],
      ["product", "write the brief"],
    ],
  );
  assert.equal(parsed.visibleText, "");
});

test("ignores unknown bots, the Chief itself, empty tasks and repeats", () => {
  const parsed = parseDelegations(
    "@delegate Ghostwriter: x\n@delegate Chief of Staff: y\n@delegate Engineering:\n@delegate Engineering: first\n@delegate Engineering: again",
    bots,
    CHIEF,
  );
  assert.deepEqual(
    parsed.delegations.map((d) => d.task),
    ["first"],
  );
  assert.equal(parsed.visibleText, "");
});

test("a reply without delegation lines stays untouched", () => {
  const reply = "Here is the plan.\nTalk to @Engineering later.";
  const parsed = parseDelegations(reply, bots, CHIEF);
  assert.equal(parsed.delegations.length, 0);
  assert.equal(parsed.visibleText, reply);
});
