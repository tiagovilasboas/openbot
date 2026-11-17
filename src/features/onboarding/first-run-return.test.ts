import assert from "node:assert/strict";
import test from "node:test";

import {
  cameBackToFirstRun,
  clearFirstRunReturn,
  consumeFirstRunConnect,
  markFirstRunConnect,
  settleFirstRunConnect,
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

test("the return is forgotten once the first-run connect succeeded", () => {
  const storage = memoryStorage();
  markFirstRunConnect(storage);
  consumeFirstRunConnect(storage);
  settleFirstRunConnect(false, storage);
  assert.equal(cameBackToFirstRun(storage), true);
  settleFirstRunConnect(true, storage);
  assert.equal(cameBackToFirstRun(storage), false);
});

test("a connect abandoned on the card does not make a later Settings connect a first-run return", () => {
  const storage = memoryStorage();
  markFirstRunConnect(storage);
  clearFirstRunReturn(storage);
  assert.equal(consumeFirstRunConnect(storage), false);
  assert.equal(cameBackToFirstRun(storage), false);
});
