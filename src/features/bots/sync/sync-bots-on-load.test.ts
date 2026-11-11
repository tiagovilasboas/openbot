import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../crew-presets.ts";
import type {
  ApiResult,
  BotsApi,
  BotsPayload,
  BotsServerState,
  LocalSnapshot,
  SyncFailure,
} from "./bots-sync-types.ts";
import { syncBotsOnLoad } from "./sync-bots-on-load.ts";

const [a, b] = CREW_PRESETS;
const okState = (
  bots: BotsServerState["bots"],
  mainBotId: string | null = a!.id,
): ApiResult => ({
  ok: true,
  state: { bots, activeBotId: a!.id, mainBotId },
});
const down: ApiResult = { ok: false, failure: { kind: "network" } };

function run(options: {
  get: ApiResult;
  put?: ApiResult;
  local?: LocalSnapshot | null;
  unsynced?: boolean;
}) {
  const puts: BotsPayload[] = [];
  const mirrored: BotsServerState[] = [];
  const failures: SyncFailure[] = [];
  const flags: boolean[] = [];
  const api: BotsApi = {
    get: async () => options.get,
    put: async (payload) => {
      puts.push(payload);
      return options.put ?? down;
    },
  };
  const outcome = syncBotsOnLoad({
    api,
    readLocal: () => options.local ?? null,
    isUnsynced: () => options.unsynced ?? false,
    setUnsynced: (value) => flags.push(value),
    mirror: (state) => mirrored.push(state),
    presets: CREW_PRESETS,
    reportFailure: (failure) => failures.push(failure),
  });
  return { outcome, puts, mirrored, failures, flags };
}

const localBots: LocalSnapshot = {
  bots: [b!],
  activeBotId: b!.id,
  storedMainBotId: b!.id,
};

test("server bots are mirrored into the browser and nothing is sent", async () => {
  const r = run({ get: okState([a!]), local: localBots });
  const outcome = await r.outcome;
  assert.equal(outcome.source, "server");
  assert.equal(outcome.canPrune, true);
  assert.equal(r.puts.length, 0);
  assert.equal(r.mirrored[0]!.bots[0], a);
});

test("an empty server imports the local list and mirrors the answer", async () => {
  const r = run({
    get: okState([]),
    local: localBots,
    put: okState([b!], b!.id),
  });
  const outcome = await r.outcome;
  assert.equal(outcome.source, "imported");
  assert.equal(outcome.canPrune, true);
  assert.deepEqual(r.puts[0], {
    bots: [b],
    activeBotId: b!.id,
    mainBotId: b!.id,
  });
  assert.equal(r.mirrored.length, 1);
  assert.deepEqual(r.flags, [false]);
});

test("both empty seeds the presets and never prunes", async () => {
  const r = run({ get: okState([]), local: null, put: okState([a!, b!]) });
  const outcome = await r.outcome;
  assert.equal(outcome.source, "seeded");
  assert.equal(outcome.canPrune, false);
  assert.equal(r.puts[0]!.bots.length, CREW_PRESETS.length);
});

test("a failed GET uses the local bots, quietly, and prunes only a trusted list", async () => {
  const trusted = await run({ get: down, local: localBots }).outcome;
  assert.equal(trusted.source, "local");
  assert.equal(trusted.canPrune, true);

  const r = run({ get: down, local: null });
  const untrusted = await r.outcome;
  assert.equal(untrusted.canPrune, false);
  assert.equal(r.puts.length, 0);
  assert.equal(r.failures.length, 0);
});

test("a 401 on GET also falls back without alarm", async () => {
  const r = run({
    get: { ok: false, failure: { kind: "http", status: 401 } },
    local: localBots,
  });
  assert.equal((await r.outcome).source, "local");
  assert.equal(r.failures.length, 0);
});

test("a refused import is reported, keeps the local list and retries next load", async () => {
  const failure: SyncFailure = {
    kind: "http",
    status: 400,
    error: "invalid_bot",
  };
  const r = run({
    get: okState([]),
    local: localBots,
    put: { ok: false, failure },
  });
  const outcome = await r.outcome;
  assert.equal(outcome.source, "local");
  assert.equal(outcome.canPrune, true);
  assert.deepEqual(r.failures, [failure]);
  assert.deepEqual(r.flags, [true]);
  assert.equal(r.mirrored.length, 0);
});

test("unsynced edits are imported over the server list", async () => {
  const r = run({
    get: okState([a!]),
    local: localBots,
    unsynced: true,
    put: okState([b!], b!.id),
  });
  assert.equal((await r.outcome).source, "imported");
  assert.equal(r.puts.length, 1);
});
