import assert from "node:assert/strict";
import test from "node:test";
import {
  createCustomSkill,
  getAllSkills,
  loadCustomSkillsFromStorage,
  parseSkillFromMarkdown,
  sanitizeSkill,
  saveCustomSkillsToStorage,
} from "./skill-storage.ts";
import { BUILTIN_SKILLS } from "./skill-types.ts";

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    length: 0,
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: () => null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

test("getAllSkills combines builtin skills with user custom skills", () => {
  const custom = [
    createCustomSkill({
      name: "Code Review",
      instructions: "Revise o código fornecido.",
    }),
  ];
  const all = getAllSkills(custom);
  assert.equal(all.length, BUILTIN_SKILLS.length + 1);
  assert.equal(all[all.length - 1]?.name, "Code Review");
  assert.equal(all[all.length - 1]?.command, "/code-review");
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

test("custom skills storage persistence works", () => {
  const storage = createMockStorage();
  assert.deepEqual(loadCustomSkillsFromStorage(storage), []);

  const s1 = createCustomSkill({
    name: "Security Audit",
    instructions: "Audite segurança",
  });
  saveCustomSkillsToStorage([s1], storage);

  const loaded = loadCustomSkillsFromStorage(storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0]?.name, "Security Audit");
});
