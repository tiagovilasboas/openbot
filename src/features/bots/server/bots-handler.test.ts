import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import { DEFAULT_BOT } from "../bot-types.ts";
import { handleGetBots, handlePutBots } from "./bots-handler.ts";

async function withDb(run: (db: DatabaseSync) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-bots-handler-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const bot = (id: string, skills: unknown[] = []) => ({
  ...DEFAULT_BOT,
  id,
  name: id,
  skills,
});
const skill = (id: string) => ({
  id,
  name: id,
  description: "",
  instructions: "x",
  command: `/${id}`,
  isBuiltin: false,
  source: "created",
  createdAt: "2026-02-02T00:00:00.000Z",
});

const put = (db: DatabaseSync, body: unknown) =>
  handlePutBots(
    new Request("http://localhost/api/bots", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    db,
  );

test("GET on an empty store returns no bots and no selection", async () => {
  await withDb((db) => {
    const response = handleGetBots(db);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    return response.json().then((body) => {
      assert.deepEqual(body, { bots: [], activeBotId: null, mainBotId: null });
    });
  });
});

test("PUT stores the state, answers it and GET reads it back", async () => {
  await withDb(async (db) => {
    const response = await put(db, {
      bots: [bot("a", [skill("s1")]), bot("b")],
      activeBotId: "b",
      mainBotId: "b",
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const stored = await response.json();
    assert.deepEqual(
      stored.bots.map((b: { id: string }) => b.id),
      ["a", "b"],
    );
    assert.equal(stored.bots[0].skills[0].id, "s1");
    assert.equal(stored.activeBotId, "b");
    assert.equal(stored.mainBotId, "b");
    assert.deepEqual(await handleGetBots(db).json(), stored);
  });
});

test("selection ids that point to a missing bot fall back like the client", async () => {
  await withDb(async (db) => {
    const state = await (
      await put(db, {
        bots: [bot("a"), bot("chief-of-staff")],
        activeBotId: "gone",
        mainBotId: "gone",
      })
    ).json();
    assert.equal(state.activeBotId, "a");
    assert.equal(state.mainBotId, "chief-of-staff");
    // "default" was the legacy name of the stock bot.
    const legacy = await (
      await put(db, {
        bots: [bot("a"), bot("chief-of-staff")],
        activeBotId: "default",
      })
    ).json();
    assert.equal(legacy.activeBotId, "chief-of-staff");
  });
});

test("omitted ids keep the stored choice and null clears it", async () => {
  await withDb(async (db) => {
    await put(db, {
      bots: [bot("a"), bot("b")],
      activeBotId: "b",
      mainBotId: "b",
    });
    const kept = await (await put(db, { bots: [bot("a"), bot("b")] })).json();
    assert.equal(kept.activeBotId, "b");
    const cleared = await (
      await put(db, { bots: [bot("a"), bot("b")], activeBotId: null })
    ).json();
    assert.equal(cleared.activeBotId, "a");
  });
});

test("bad requests answer 400 with a stable code and leave the store alone", async () => {
  await withDb(async (db) => {
    await put(db, { bots: [bot("keep")] });
    const cases: Array<[unknown, string]> = [
      ["{not json", "invalid_body"],
      [[bot("a")], "invalid_body"],
      [{ bots: "nope" }, "invalid_body"],
      [{ bots: [] }, "invalid_body"],
      [{ bots: [bot("a")], activeBotId: "bad id!" }, "invalid_body"],
      [{ bots: [bot("a")], mainBotId: 7 }, "invalid_body"],
      [{ bots: [bot("a"), { id: "x" }] }, "invalid_bot"],
      [
        { bots: Array.from({ length: 101 }, (_, i) => bot(`b${i}`)) },
        "too_many_bots",
      ],
      [
        {
          bots: [
            bot(
              "a",
              Array.from({ length: 101 }, (_, i) => skill(`s${i}`)),
            ),
          ],
        },
        "too_many_skills",
      ],
    ];
    for (const [body, code] of cases) {
      const response = await put(db, body);
      assert.equal(response.status, 400, code);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), { error: code });
    }
    const after = await handleGetBots(db).json();
    assert.deepEqual(
      after.bots.map((b: { id: string }) => b.id),
      ["keep"],
    );
  });
});
