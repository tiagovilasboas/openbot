import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeFirstRunConnect,
  markFirstRunConnect,
} from "./first-run-return.ts";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

test("the first-run connect flag is consumed exactly once", () => {
  const storage = memoryStorage();
  assert.equal(consumeFirstRunConnect(storage), false);
  markFirstRunConnect(storage);
  assert.equal(consumeFirstRunConnect(storage), true);
  assert.equal(consumeFirstRunConnect(storage), false);
});

test("without storage the flag is simply absent", () => {
  markFirstRunConnect(null);
  assert.equal(consumeFirstRunConnect(null), false);
});

test("a throwing storage never breaks the return", () => {
  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {},
  };
  markFirstRunConnect(broken);
  assert.equal(consumeFirstRunConnect(broken), false);
});
