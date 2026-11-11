import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openLocalStore } from "../../shared/local-store/local-store.ts";
import {
  handleDeleteKey,
  handleListKeys,
  handlePutKey,
  type VaultContext,
} from "./keys-handler.ts";
import { migrateKeyVault, readProviderKey } from "./provider-key-repository.ts";

const SECRET = "sk-or-v1-HANDLER-SECRET-42";
const URL_BASE = "http://localhost/api/keys";

async function withContext(run: (context: VaultContext) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-vault-handler-"));
  const db = openLocalStore(dir);
  try {
    migrateKeyVault(db);
    await run({ db, masterKey: randomBytes(32) });
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const put = (body: unknown) =>
  new Request(URL_BASE, {
    method: "PUT",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const valid = {
  provider: "router",
  origin: "https://openrouter.ai/api/v1",
  key: SECRET,
};

test("PUT saves the key and answers without it", async () => {
  await withContext(async (context) => {
    const response = await handlePutKey(put(valid), context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const text = await response.text();
    assert.ok(!text.includes(SECRET));
    const body = JSON.parse(text);
    assert.equal(body.provider, "router");
    assert.equal(body.origin, "https://openrouter.ai");
    assert.equal(typeof body.updatedAt, "number");
    assert.equal(
      readProviderKey(
        context.db,
        context.masterKey,
        "router",
        "https://openrouter.ai",
      ),
      SECRET,
    );
  });
});

test("GET lists summaries only, with no-store", async () => {
  await withContext(async (context) => {
    await handlePutKey(put(valid), context);
    const response = handleListKeys(context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const text = await response.text();
    assert.ok(!text.includes(SECRET));
    const body = JSON.parse(text);
    assert.deepEqual(
      body.keys.map((k: { provider: string; origin: string }) => [
        k.provider,
        k.origin,
      ]),
      [["router", "https://openrouter.ai"]],
    );
  });
});

test("PUT rejects bad input with stable codes", async () => {
  await withContext(async (context) => {
    const cases: Array<[unknown, string]> = [
      ["{not json", "invalid_body"],
      ["[]", "invalid_body"],
      ["null", "invalid_body"],
      [{ ...valid, key: "x".repeat(5000) }, "invalid_body"],
      [{ ...valid, provider: "local" }, "invalid_provider"],
      [{ ...valid, provider: undefined }, "invalid_provider"],
      [{ ...valid, origin: "http://example.com" }, "invalid_origin"],
      [{ ...valid, origin: 5 }, "invalid_origin"],
      [{ ...valid, key: "has space" }, "invalid_key"],
      [{ ...valid, key: "" }, "invalid_key"],
      [{ ...valid, key: "k".repeat(501) }, "invalid_key"],
    ];
    for (const [body, code] of cases) {
      const response = await handlePutKey(put(body), context);
      assert.equal(response.status, 400, code);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), { error: code });
    }
    assert.equal(
      JSON.parse(await handleListKeys(context).text()).keys.length,
      0,
    );
  });
});

test("DELETE removes a provider and validates the query", async () => {
  await withContext(async (context) => {
    await handlePutKey(put(valid), context);
    const removed = handleDeleteKey(
      new Request(`${URL_BASE}?provider=router`, { method: "DELETE" }),
      context,
    );
    assert.equal(removed.status, 204);
    assert.equal(removed.headers.get("cache-control"), "no-store");
    assert.equal(
      JSON.parse(await handleListKeys(context).text()).keys.length,
      0,
    );
    for (const url of [URL_BASE, `${URL_BASE}?provider=nope`]) {
      const bad = handleDeleteKey(
        new Request(url, { method: "DELETE" }),
        context,
      );
      assert.equal(bad.status, 400);
      assert.deepEqual(await bad.json(), { error: "invalid_provider" });
    }
  });
});
