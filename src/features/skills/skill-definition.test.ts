import assert from "node:assert/strict";
import test from "node:test";
import {
  createCustomSkill,
  parseSkillFromMarkdown,
  sanitizeSkill,
  sanitizeSkillList,
} from "./skill-definition.ts";

test("createCustomSkill derives the slash command from the name", () => {
  const skill = createCustomSkill({
    name: "Code Review",
    instructions: "Revise o código fornecido.",
  });
  assert.equal(skill.command, "/code-review");
  assert.equal(skill.isBuiltin, false);
});

test("sanitizeSkill rejects invalid inputs and cleans fields", () => {
  const valid = sanitizeSkill({
    id: "skill_1",
    name: "Refactor Helper",
    command: "refactor",
    instructions: "Ajude a refatorar",
  });
  assert.ok(valid);
  assert.equal(valid.command, "/refactor");

  const invalid = sanitizeSkill({ id: "", name: "" });
  assert.equal(invalid, null);
});

test("parseSkillFromMarkdown parses title, description quote, and instructions", () => {
  const md = `# Code Reviewer
> Analisa diffs e identifica vulnerabilidades

Você deve agir como um revisor de código experiente.
- Verifique tipos
- Verifique tratamento de erros`;

  const parsed = parseSkillFromMarkdown(md);
  assert.ok(parsed);
  assert.equal(parsed.name, "Code Reviewer");
  assert.equal(
    parsed.description,
    "Analisa diffs e identifica vulnerabilidades",
  );
  assert.ok(parsed.instructions.includes("Verifique tipos"));
});

test("sanitizeSkillList keeps valid skills and drops the rest", () => {
  const list = sanitizeSkillList([
    { id: "skill_1", name: "Audit", instructions: "Audite" },
    { id: "", name: "Broken" },
    "legacy-id",
  ]);
  assert.deepEqual(
    list.map((s) => s.command),
    ["/audit"],
  );
  assert.deepEqual(sanitizeSkillList("nope"), []);
});
