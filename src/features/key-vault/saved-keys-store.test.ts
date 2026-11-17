import assert from "node:assert/strict";
import test from "node:test";

import { readSavedKeysState, refreshSavedKeys } from "./saved-keys-store.ts";

function answerWith(status: number, body: unknown) {
  globalThis.fetch = (async () =>
    Response.json(body, { status })) as unknown as typeof fetch;
}

test("a failed load is a known state, and a later answer clears it", async () => {
  answerWith(500, {});
  await refreshSavedKeys();
  assert.equal(readSavedKeysState().loaded, false);
  assert.equal(readSavedKeysState().failed, true);

  answerWith(200, { keys: [] });
  await refreshSavedKeys();
  assert.equal(readSavedKeysState().loaded, true);
  assert.equal(readSavedKeysState().failed, false);
});

test("a failed refresh keeps the keys already known", async () => {
  answerWith(200, {
    keys: [
      { provider: "router", origin: "https://openrouter.ai", updatedAt: 1 },
    ],
  });
  await refreshSavedKeys();
  answerWith(500, {});
  await refreshSavedKeys();
  const state = readSavedKeysState();
  assert.equal(state.loaded, true);
  assert.equal(state.failed, false);
  assert.ok(state.keys.router);
});
