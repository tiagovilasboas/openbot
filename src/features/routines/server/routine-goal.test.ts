import assert from "node:assert/strict";
import { test } from "node:test";
import type { BotGoal } from "../../bots/bot-goal.ts";
import { checkRoutineInput, MAX_PROMPT_LENGTH } from "../routine-input.ts";
import { withGoalContext } from "./routine-goal.ts";

const goal: BotGoal = {
  title: "Ship the report",
  description: "Quarterly numbers",
  status: "active",
  progress: "Data collected",
  updatedAt: "2026-11-20T10:00:00.000Z",
};

test("a linked run puts the active goal in front of the prompt", () => {
  const text = withGoalContext("Check the PRs", goal, "en");
  assert.equal(
    text,
    "Your current goal:\nShip the report\nQuarterly numbers\nProgress: Data collected\n\nCheck the PRs",
  );
  assert.ok(
    withGoalContext("Veja os PRs", goal, "pt").startsWith("Seu objetivo"),
  );
});

test("a goal that is not active, or missing, adds nothing", () => {
  assert.equal(withGoalContext("p", undefined, "en"), "p");
  assert.equal(withGoalContext("p", { ...goal, status: "done" }, "en"), "p");
  assert.equal(withGoalContext("p", { ...goal, status: "paused" }, "en"), "p");
});

test("the goal never pushes the message past the request limit", () => {
  const prompt = "x".repeat(MAX_PROMPT_LENGTH - 20);
  const text = withGoalContext(prompt, goal, "en");
  assert.ok(text.length <= MAX_PROMPT_LENGTH);
  assert.ok(text.endsWith(prompt));
  const full = "x".repeat(MAX_PROMPT_LENGTH);
  assert.equal(withGoalContext(full, goal, "en"), full);
});

const input = (id: string, goalLinked: unknown) => ({
  id,
  botId: "bot-a",
  title: "T",
  prompt: "P",
  schedule: { kind: "interval", everyMinutes: 10 },
  goalLinked,
});

test("the goal link is kept only for a plain routine", () => {
  const kept = checkRoutineInput(input("r1", true));
  assert.ok(kept.ok && kept.routine.goalLinked === true);
  for (const bad of [false, "yes", 1, undefined]) {
    const dropped = checkRoutineInput(input("r1", bad));
    assert.ok(dropped.ok && !("goalLinked" in dropped.routine));
  }
});

test("wake-ups and handoffs cannot be linked", () => {
  for (const id of ["w_abc", "m_abc"]) {
    const checked = checkRoutineInput(input(id, true));
    assert.ok(checked.ok && !("goalLinked" in checked.routine));
  }
});
