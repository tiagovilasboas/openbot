import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import { handleGetSettings, handlePutSettings } from "./settings-handler.ts";
import { readSettings } from "./settings-repository.ts";

async function withDb(run: (db: DatabaseSync) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-settings-handler-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const put = (db: DatabaseSync, body: unknown) =>
  handlePutSettings(
    new Request("http://localhost/api/settings", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    db,
  );

const router = {
  provider: "router",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "some/model",
};

test("GET on an empty store returns no settings, uncached", async () => {
  await withDb(async (db) => {
    const response = handleGetSettings(db);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { settings: {} });
  });
});

test("PUT saves each key and GET returns only the saved ones", async () => {
  await withDb(async (db) => {
    const response = await put(db, {
      settings: { language: "en", memoryEnabled: false, modelConfig: router },
    });
    assert.equal(response.status, 200);
    const expected = {
      settings: { language: "en", memoryEnabled: false, modelConfig: router },
    };
    assert.deepEqual(await response.json(), expected);
    assert.deepEqual(await handleGetSettings(db).json(), expected);
  });
});

test("PUT merges per key: an omitted key stays, null clears one", async () => {
  await withDb(async (db) => {
    await put(db, { settings: { language: "es", memoryEnabled: true } });
    await put(db, { settings: { memoryEnabled: false } });
    assert.deepEqual(readSettings(db), {
      language: "es",
      memoryEnabled: false,
    });
    await put(db, { settings: { language: null } });
    assert.deepEqual(readSettings(db), { memoryEnabled: false });
    const empty = await put(db, { settings: {} });
    assert.equal(empty.status, 200);
    assert.deepEqual(readSettings(db), { memoryEnabled: false });
  });
});

test("a model config loses its apiKey before it is stored", async () => {
  await withDb(async (db) => {
    const response = await put(db, {
      settings: { modelConfig: { ...router, apiKey: "sk-secret-value" } },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(readSettings(db).modelConfig, router);
    const raw = db.prepare("SELECT value FROM settings").all();
    assert.ok(!JSON.stringify(raw).includes("sk-secret-value"));
    assert.ok(
      !JSON.stringify(await handleGetSettings(db).json()).includes("sk-"),
    );
  });
});

test("an anthropic config is kept without its key too", async () => {
  await withDb(async (db) => {
    await put(db, {
      settings: {
        modelConfig: { provider: "anthropic", model: "m", apiKey: "sk-ant-1" },
      },
    });
    assert.deepEqual(readSettings(db).modelConfig, {
      provider: "anthropic",
      model: "m",
    });
  });
});

test("an unknown key is refused with unknown_setting", async () => {
  await withDb(async (db) => {
    await put(db, { settings: { language: "en" } });
    const response = await put(db, {
      settings: { language: "pt", githubToken: "x" },
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "unknown_setting",
      key: "githubToken",
    });
    // Nothing from the refused request was written.
    assert.deepEqual(readSettings(db), { language: "en" });
  });
});

test("an invalid value names its key and writes nothing", async () => {
  await withDb(async (db) => {
    for (const settings of [
      { language: "fr" },
      { language: 3 },
      { memoryEnabled: "yes" },
      { modelConfig: { provider: "router", baseUrl: "nope", model: "m" } },
      { modelConfig: "text" },
    ]) {
      const response = await put(db, {
        settings: { ...settings, memoryEnabled: false, ...settings },
      });
      assert.equal(response.status, 400);
      const body = (await response.json()) as { error: string; key: string };
      assert.equal(body.error, "invalid_setting");
      assert.equal(body.key, Object.keys(settings)[0]);
    }
    assert.deepEqual(readSettings(db), {});
  });
});

test("a bad body is invalid_body", async () => {
  await withDb(async (db) => {
    for (const body of [
      "not json",
      "null",
      "[]",
      { other: 1 },
      { settings: [] },
      { settings: "x" },
    ]) {
      const response = await put(db, body);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "invalid_body" });
    }
  });
});

test("a body over the cap is payload_too_large", async () => {
  await withDb(async (db) => {
    const response = await put(db, {
      settings: { modelConfig: { ...router, model: "x".repeat(20 * 1024) } },
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "payload_too_large" });
  });
});

test("damaged and unknown rows are skipped on read", async () => {
  await withDb(async (db) => {
    await put(db, { settings: { language: "en" } });
    const insert = db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, 1)",
    );
    insert.run("memoryEnabled", "{not json");
    insert.run("modelConfig", JSON.stringify({ provider: "router" }));
    insert.run("legacy", JSON.stringify(true));
    assert.deepEqual(readSettings(db), { language: "en" });
    assert.deepEqual(await handleGetSettings(db).json(), {
      settings: { language: "en" },
    });
  });
});
