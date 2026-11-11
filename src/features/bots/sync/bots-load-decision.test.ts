import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../crew-presets.ts";
import { DEFAULT_BOT } from "../bot-types.ts";
import { buildPayload, decideBotsLoad } from "./bots-load-decision.ts";
import type {
  ApiResult,
  BotsServerState,
  LocalSnapshot,
} from "./bots-sync-types.ts";

const [a, b] = CREW_PRESETS;
const presets = CREW_PRESETS;

const serverWith = (bots: BotsServerState["bots"]): ApiResult => ({
  ok: true,
  state: { bots, activeBotId: a!.id, mainBotId: a!.id },
});
const local = (): LocalSnapshot => ({
  bots: [b!],
  activeBotId: b!.id,
  storedMainBotId: null,
});
const down: ApiResult = { ok: false, failure: { kind: "network" } };

test("the server wins when it has bots", () => {
  const decision = decideBotsLoad({
    server: serverWith([a!]),
    local: local(),
    unsynced: false,
    presets,
  });
  assert.equal(decision.action, "use-server");
});

test("an empty server takes the bots of this browser", () => {
  const decision = decideBotsLoad({
    server: serverWith([]),
    local: local(),
    unsynced: false,
    presets,
  });
  assert.equal(decision.action, "import");
  assert.ok(decision.action === "import");
  assert.deepEqual(decision.payload, {
    bots: [b],
    activeBotId: b!.id,
    mainBotId: b!.id,
  });
});

test("an empty server and an empty browser seed the presets", () => {
  const decision = decideBotsLoad({
    server: serverWith([]),
    local: null,
    unsynced: false,
    presets,
  });
  assert.ok(decision.action === "seed");
  assert.equal(decision.payload.bots.length, presets.length);
  assert.equal(decision.payload.activeBotId, DEFAULT_BOT.id);
});

test("an unreachable server falls back to the browser copy", () => {
  for (const localState of [local(), null]) {
    const decision = decideBotsLoad({
      server: down,
      local: localState,
      unsynced: false,
      presets,
    });
    assert.equal(decision.action, "use-local");
  }
});

test("edits the server never confirmed are sent instead of overwritten", () => {
  const decision = decideBotsLoad({
    server: serverWith([a!]),
    local: local(),
    unsynced: true,
    presets,
  });
  assert.equal(decision.action, "import");
});

test("unsynced without a trusted local list still uses the server", () => {
  const decision = decideBotsLoad({
    server: serverWith([a!]),
    local: null,
    unsynced: true,
    presets,
  });
  assert.equal(decision.action, "use-server");
});

test("buildPayload resolves the main bot like the client", () => {
  assert.equal(buildPayload([a!, b!], a!.id, b!.id).mainBotId, b!.id);
  assert.equal(buildPayload([b!], a!.id, "gone").mainBotId, b!.id);
});
