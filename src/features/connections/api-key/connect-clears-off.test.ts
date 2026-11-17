import assert from "node:assert/strict";
import test from "node:test";
import { applyModelAfterConnect } from "./manage-connection.ts";
import {
  readOffProviders,
  writeOffProviders,
} from "../switch/provider-switch-store.ts";

function fakeStorage(): Storage {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  } as Storage;
}

test("a connect clears that provider off flag and keeps the others", () => {
  Object.assign(globalThis, {
    window: { localStorage: fakeStorage(), dispatchEvent: () => true },
  });
  writeOffProviders(["router", "anthropic"]);
  applyModelAfterConnect("router");
  assert.deepEqual(readOffProviders(), ["anthropic"]);
  applyModelAfterConnect("github");
  applyModelAfterConnect("anthropic");
  assert.deepEqual(readOffProviders(), []);
  Reflect.deleteProperty(globalThis, "window");
});
