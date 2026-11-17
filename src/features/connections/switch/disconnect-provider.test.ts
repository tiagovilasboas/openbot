import assert from "node:assert/strict";
import test from "node:test";
import { disconnectService } from "../panel/disconnect-connection.ts";
import { disconnectProvider } from "./set-provider-enabled.ts";
import {
  readOffProviders,
  writeOffProviders,
} from "./provider-switch-store.ts";

function useFakeWindow(): void {
  const items = new Map<string, string>();
  Object.assign(globalThis, {
    window: {
      localStorage: {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => void items.set(key, value),
        removeItem: (key: string) => void items.delete(key),
      },
      dispatchEvent: () => true,
    },
  });
}

test("a failed disconnect keeps the off flag and reports the failure", async () => {
  useFakeWindow();
  writeOffProviders(["router"]);
  const change = await disconnectProvider("router", async () => ({
    ok: false,
    reason: "disconnectFailed",
  }));
  assert.deepEqual(change, { ok: false, reason: "disconnectFailed" });
  assert.deepEqual(readOffProviders(), ["router"]);
});

test("a confirmed disconnect clears the off flag", async () => {
  useFakeWindow();
  writeOffProviders(["router", "anthropic"]);
  const change = await disconnectProvider("router", async () => ({ ok: true }));
  assert.deepEqual(change, { ok: true });
  assert.deepEqual(readOffProviders(), ["anthropic"]);
});

test("the service reports a server that refused the delete", async () => {
  useFakeWindow();
  const result = await disconnectService("router", async () => false);
  assert.deepEqual(result, { ok: false, reason: "disconnectFailed" });
});
