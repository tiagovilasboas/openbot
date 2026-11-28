import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openLocalStore } from "../../shared/local-store/local-store.ts";
import { resolveOAuthAccessToken } from "./oauth-refresh.ts";
import {
  listOAuthSessionSummaries,
  readOAuthSession,
  saveOAuthClientId,
  saveOAuthSession,
} from "./oauth-session-repository.ts";
import { migrateKeyVault } from "./provider-key-repository.ts";
import { resolveVaultOAuthToken } from "./vault-key-lookup.ts";

const ORIGIN = "https://api.openai.com";

function withVault(
  run: (ctx: {
    db: ReturnType<typeof openLocalStore>;
    masterKey: Buffer;
  }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-oauth-refresh-"));
  const db = openLocalStore(dir);
  migrateKeyVault(db);
  return run({ db, masterKey: randomBytes(32) }).finally(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
}

test("returns fresh token without calling fetch", async () => {
  await withVault(async ({ db, masterKey }) => {
    saveOAuthSession(db, masterKey, {
      provider: "chatgpt",
      origin: ORIGIN,
      session: {
        accessToken: "fresh-token",
        refreshToken: "rt-1",
        expiresAt: 200_000,
      },
    });
    let calls = 0;
    const result = await resolveOAuthAccessToken(
      db,
      masterKey,
      "chatgpt",
      ORIGIN,
      {
        now: () => 100_000,
        fetchImpl: (async () => {
          calls += 1;
          throw new Error("should not fetch");
        }) as typeof fetch,
      },
    );
    assert.deepEqual(result, {
      ok: true,
      accessToken: "fresh-token",
      refreshed: false,
    });
    assert.equal(calls, 0);
  });
});

test("refreshes expiring token within 60s skew and persists rotated tokens", async () => {
  await withVault(async ({ db, masterKey }) => {
    saveOAuthClientId(db, "chatgpt", "oaiapp_client_99", 1_000);
    saveOAuthSession(db, masterKey, {
      provider: "chatgpt",
      origin: ORIGIN,
      session: {
        accessToken: "old-token",
        refreshToken: "rt-old",
        expiresAt: 150_000,
        accountLabel: "Plus",
      },
    });

    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit = {}) => {
      requests.push({ url, init });
      return Response.json({
        access_token: "new-token",
        refresh_token: "rt-new",
        expires_in: 3600,
      });
    }) as unknown as typeof fetch;

    const result = await resolveVaultOAuthToken(db, "chatgpt", ORIGIN, {
      masterKey,
      now: () => 100_000,
      fetchImpl,
    });

    assert.deepEqual(result, {
      ok: true,
      accessToken: "new-token",
      refreshed: true,
    });
    assert.equal(requests.length, 1);
    assert.equal(
      requests[0].url,
      "https://auth.openai.com/api/accounts/oauth/token",
    );
    assert.equal(requests[0].init.method, "POST");
    assert.equal(requests[0].init.redirect, "error");
    assert.ok(requests[0].init.signal instanceof AbortSignal);

    const form = new URLSearchParams(String(requests[0].init.body));
    assert.equal(form.get("grant_type"), "refresh_token");
    assert.equal(form.get("refresh_token"), "rt-old");
    assert.equal(form.get("client_id"), "oaiapp_client_99");

    const updated = readOAuthSession(db, masterKey, "chatgpt", ORIGIN);
    assert.equal(updated?.accessToken, "new-token");
    assert.equal(updated?.refreshToken, "rt-new");
    assert.equal(updated?.expiresAt, 100_000 + 3_600_000);
    assert.equal(updated?.accountLabel, "Plus");
  });
});

test("single-flight lock deduplicates concurrent refreshes per provider", async () => {
  await withVault(async ({ db, masterKey }) => {
    saveOAuthSession(db, masterKey, {
      provider: "chatgpt",
      origin: ORIGIN,
      session: {
        accessToken: "old-token",
        refreshToken: "rt-1",
        expiresAt: 110_000,
      },
    });

    let calls = 0;
    let releaseFetch!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });
    const fetchImpl = (async () => {
      calls += 1;
      await gate;
      return Response.json({
        access_token: "rotated-token",
        refresh_token: "rt-2",
        expires_in: 600,
      });
    }) as unknown as typeof fetch;

    const p1 = resolveOAuthAccessToken(db, masterKey, "chatgpt", ORIGIN, {
      now: () => 100_000,
      fetchImpl,
    });
    const p2 = resolveOAuthAccessToken(db, masterKey, "chatgpt", ORIGIN, {
      now: () => 100_000,
      fetchImpl,
    });
    releaseFetch();
    const [r1, r2] = await Promise.all([p1, p2]);

    assert.equal(calls, 1);
    assert.deepEqual(r1, {
      ok: true,
      accessToken: "rotated-token",
      refreshed: true,
    });
    assert.deepEqual(r2, {
      ok: true,
      accessToken: "rotated-token",
      refreshed: true,
    });
  });
});

test("marks needsReauth and returns closed error on 400 invalid_grant or 401", async () => {
  for (const [status, body] of [
    [
      400,
      { error: "invalid_grant", error_description: "SECRET_UPSTREAM_TEXT" },
    ],
    [401, { error: "unauthorized", detail: "SECRET_UPSTREAM_TEXT" }],
  ] as const) {
    await withVault(async ({ db, masterKey }) => {
      saveOAuthSession(db, masterKey, {
        provider: "chatgpt",
        origin: ORIGIN,
        session: {
          accessToken: "old-token",
          refreshToken: "rt-revoked",
          expiresAt: 100_000,
        },
      });
      const fetchImpl = (async () =>
        Response.json(body, { status })) as unknown as typeof fetch;

      const result = await resolveOAuthAccessToken(
        db,
        masterKey,
        "chatgpt",
        ORIGIN,
        { now: () => 100_000, fetchImpl },
      );

      assert.deepEqual(result, { ok: false, reason: "reauth_required" });
      assert.ok(!JSON.stringify(result).includes("SECRET_UPSTREAM_TEXT"));
      assert.equal(listOAuthSessionSummaries(db)[0]?.needsReauth, true);

      let secondCalls = 0;
      const followUp = await resolveOAuthAccessToken(
        db,
        masterKey,
        "chatgpt",
        ORIGIN,
        {
          now: () => 100_000,
          fetchImpl: (async () => {
            secondCalls += 1;
            return Response.json({});
          }) as unknown as typeof fetch,
        },
      );
      assert.deepEqual(followUp, { ok: false, reason: "reauth_required" });
      assert.equal(secondCalls, 0);
    });
  }
});

test("transient 503 failure does not mark needsReauth", async () => {
  await withVault(async ({ db, masterKey }) => {
    saveOAuthSession(db, masterKey, {
      provider: "chatgpt",
      origin: ORIGIN,
      session: {
        accessToken: "old-token",
        refreshToken: "rt-1",
        expiresAt: 100_000,
      },
    });
    const fetchImpl = (async () =>
      new Response("down", { status: 503 })) as unknown as typeof fetch;

    const result = await resolveOAuthAccessToken(
      db,
      masterKey,
      "chatgpt",
      ORIGIN,
      { now: () => 100_000, fetchImpl },
    );

    assert.deepEqual(result, { ok: false, reason: "refresh_failed" });
    assert.equal(listOAuthSessionSummaries(db)[0]?.needsReauth, false);
  });
});

test("rejects unsupported provider outside allowlist", async () => {
  await withVault(async ({ db, masterKey }) => {
    saveOAuthSession(db, masterKey, {
      provider: "custom-oauth",
      origin: "https://evil.example",
      session: {
        accessToken: "tok",
        refreshToken: "rt",
        expiresAt: 100_000,
      },
    });
    let calls = 0;
    const result = await resolveOAuthAccessToken(
      db,
      masterKey,
      "custom-oauth",
      "https://evil.example",
      {
        now: () => 100_000,
        fetchImpl: (async () => {
          calls += 1;
          return Response.json({});
        }) as unknown as typeof fetch,
      },
    );
    assert.deepEqual(result, { ok: false, reason: "unsupported_provider" });
    assert.equal(calls, 0);
  });
});
