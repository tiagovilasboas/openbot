import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { liveChiefText } from "./live-chief-text.ts";

const bots = [...CREW_PRESETS] as BotProfile[];
const chief = CREW_PRESETS[0] as BotProfile;
const show = (text: string) => liveChiefText(text, bots, chief.id);

test("plain text shows as it grows", () => {
  assert.equal(show("Vou "), "Vou");
  assert.equal(show("Vou ajudar."), "Vou ajudar.");
});

test("a delegation line never shows, not even half written", () => {
  assert.equal(show("Ok.\n@"), "Ok.");
  assert.equal(show("Ok.\n@dele"), "Ok.");
  assert.equal(show("Ok.\n@delegate Engineering: fix"), "Ok.");
  assert.equal(show("Ok.\n@delegate Engineering: fix\nMais"), "Ok.\nMais");
  assert.equal(show("@delegate Engineering: fix"), "");
});

test("a decorated delegation line is held back too", () => {
  assert.equal(show("Ok.\n- @delegate Engineering: fix"), "Ok.");
});
