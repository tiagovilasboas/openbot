import assert from "node:assert/strict";
import test from "node:test";
import { buildSetupCrew, SETUP_ROLES } from "./agent-setup.ts";
import { DEFAULT_BOTS_LIST, parseBots } from "./bot-storage.ts";

test("a fresh install has no agents at all", () => {
  assert.deepEqual(DEFAULT_BOTS_LIST, []);
  assert.deepEqual(parseBots(null), []);
  assert.deepEqual(parseBots("[]"), []);
});

test("no name, no crew", () => {
  assert.equal(
    buildSetupCrew(
      { name: "  ", title: "", instructions: "", roleIds: [] },
      "pt",
    ),
    null,
  );
});

test("only the main agent unless roles are checked", () => {
  const crew = buildSetupCrew(
    { name: " Ana ", title: "Coordena", instructions: "", roleIds: [] },
    "en",
  )!;
  assert.equal(crew.bots.length, 1);
  assert.equal(crew.bots[0].name, "Ana");
  assert.equal(crew.bots[0].title, "Coordena");
  assert.equal(crew.mainBotId, crew.bots[0].id);
  assert.match(crew.bots[0].description, /main agent/);
});

test("checked roles join after the main agent, in the offered order", () => {
  const [first, second] = SETUP_ROLES;
  const crew = buildSetupCrew(
    {
      name: "Ana",
      title: "",
      instructions: "Be brief.",
      roleIds: [second.id, first.id, "not-a-role"],
    },
    "pt",
  )!;
  assert.deepEqual(crew.bots.map((b) => b.id).slice(1), [first.id, second.id]);
  assert.equal(crew.bots[0].description, "Be brief.");
  assert.ok(!SETUP_ROLES.some((r) => r.id === "chief-of-staff"));
});
