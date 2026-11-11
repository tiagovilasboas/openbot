import { LANGUAGES } from "../language/language.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { acceptSuggestion } from "./accept-suggestion.ts";
import { describeSuggestionFailure } from "./describe-suggestion-failure.ts";
import { createCustomSkill } from "./skill-definition.ts";
import { skillsCopy } from "./skills-copy.ts";
import { suggestionCopy } from "./suggestion-copy.ts";
import { SUGGEST_MIN_MESSAGES } from "./suggestion-history.ts";

const draft = {
  name: "Code review",
  command: "/code-review",
  description: "Reviews diffs",
  instructions: "Read the diff.",
};

test("an accepted draft is a normal skill marked suggested", () => {
  const skill = acceptSuggestion(draft, []);
  assert.equal(skill.source, "suggested");
  assert.equal(skill.isBuiltin, false);
  assert.equal(skill.command, "/code-review");
  assert.equal(skill.instructions, "Read the diff.");
});

test("a command the bot already uses gets a numbered variant", () => {
  const first = createCustomSkill({ name: "Code review", instructions: "x" });
  const second = acceptSuggestion(draft, [first]);
  assert.equal(second.command, "/code-review-2");
  const third = acceptSuggestion(draft, [first, second]);
  assert.equal(third.command, "/code-review-3");
});

test("both languages have the same suggestion copy and the badge", () => {
  assert.deepEqual(
    Object.keys(suggestionCopy.pt).sort(),
    Object.keys(suggestionCopy.en).sort(),
  );
  for (const lang of LANGUAGES) {
    assert.ok(skillsCopy[lang].suggestedBadge.length > 0);
    assert.ok(skillsCopy[lang].suggestedWarning.length > 0);
  }
});

test("each failure has human copy in both languages, without raw codes", () => {
  const failures = [
    { kind: "not_enough_history" },
    { kind: "invalid_suggestion" },
    { kind: "unavailable" },
    { kind: "error", failure: { kind: "auth", status: 401 } },
    { kind: "error", failure: { kind: "timeout" } },
    { kind: "error", failure: { kind: "unreachable" } },
  ] as const;
  for (const language of LANGUAGES) {
    for (const outcome of failures) {
      const text = describeSuggestionFailure(outcome, language);
      assert.ok(text.length > 10);
      assert.ok(!/invalid_suggestion|not_enough_history|\{\w+\}/.test(text));
    }
  }
  assert.ok(
    describeSuggestionFailure({ kind: "not_enough_history" }, "en").includes(
      String(SUGGEST_MIN_MESSAGES),
    ),
  );
});
