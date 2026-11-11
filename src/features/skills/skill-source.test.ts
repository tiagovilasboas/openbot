import { LANGUAGES } from "../language/language.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { skillsCopy } from "./skills-copy.ts";
import { createCustomSkill, sanitizeSkill } from "./skill-definition.ts";

test("skills default to created and can be marked imported", () => {
  const made = createCustomSkill({ name: "A", instructions: "x" });
  assert.equal(made.source, "created");
  const pasted = createCustomSkill({
    name: "B",
    instructions: "x",
    source: "imported",
  });
  assert.equal(pasted.source, "imported");
});

test("the sanitizer keeps imported and defaults old data to created", () => {
  const base = { id: "s1", name: "S", instructions: "x" };
  assert.equal(
    sanitizeSkill({ ...base, source: "imported" })?.source,
    "imported",
  );
  assert.equal(sanitizeSkill(base)?.source, "created");
  assert.equal(sanitizeSkill({ ...base, source: "evil" })?.source, "created");
  assert.equal(sanitizeSkill({ ...base, source: 3 })?.source, "created");
});

test("the imported badge and warning exist in both languages", () => {
  for (const lang of LANGUAGES) {
    assert.ok(skillsCopy[lang].importedBadge.length > 0);
    assert.ok(skillsCopy[lang].importedWarning.length > 0);
  }
});

test("the suggested source survives storage; unknown sources do not", () => {
  const base = { id: "s1", name: "S", instructions: "x" };
  assert.equal(
    sanitizeSkill({ ...base, source: "suggested" })?.source,
    "suggested",
  );
  assert.equal(sanitizeSkill({ ...base, source: "evil" })?.source, "created");
});
