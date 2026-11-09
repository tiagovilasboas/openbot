import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import {
  buildCrewRoster,
  crewHandle,
  crewRole,
  isChiefBot,
} from "./crew-roster.ts";

const chief = CREW_PRESETS[0] as BotProfile;
const engineering = CREW_PRESETS[1] as BotProfile;

test("only the Chief of Staff counts as the chief", () => {
  assert.equal(isChiefBot(chief), true);
  assert.equal(isChiefBot({ id: "default" }), true);
  assert.equal(isChiefBot(engineering), false);
});

test("handles drop spaces so they resolve like @mentions", () => {
  assert.equal(crewHandle({ name: "Chief of Staff" }), "@ChiefofStaff");
  assert.equal(crewHandle(engineering), "@Engineering");
});

test("the role skips the 'you are' opener and keeps one sentence", () => {
  assert.equal(
    crewRole(engineering),
    "Cuida de código, pull requests e CI: investiga, propõe e revisa mudanças.",
  );
  assert.equal(
    crewRole({ description: "Reviews code for bugs." }),
    "Reviews code for bugs.",
  );
  const long = crewRole({ description: "x".repeat(300) });
  assert.equal(long.length, 140);
  assert.ok(long.endsWith("…"));
});

test("the roster lists every other bot with handle, role and skills", () => {
  const withSkill: BotProfile = {
    ...engineering,
    skills: [
      {
        id: "s1",
        name: "Code Review",
        description: "",
        instructions: "",
        command: "/code-review",
        isBuiltin: false,
        createdAt: "",
      },
    ],
  };
  const roster = buildCrewRoster(chief, [chief, withSkill], "en");
  assert.match(roster, /^Your crew/);
  assert.match(
    roster,
    /- Engineering @Engineering \(Código, PRs e CI\): Cuida de código.*\[skills: Code Review\]/,
  );
  assert.doesNotMatch(roster, /Chief of Staff/);
});

test("the roster header follows the language and bots without skills say so", () => {
  const roster = buildCrewRoster(chief, [...CREW_PRESETS], "pt");
  assert.match(roster, /^Sua equipe/);
  assert.equal(roster.split("\n").length, CREW_PRESETS.length);
  assert.match(roster, /\[skills: sem skills\]/);
});

test("a Chief alone gets no roster", () => {
  assert.equal(buildCrewRoster(chief, [chief], "en"), "");
});
