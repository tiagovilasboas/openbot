import assert from "node:assert/strict";
import test from "node:test";
import {
  describeProviderState,
  parseOffProviders,
  refuseWhileRunning,
  validateOffProviders,
  withProviderOff,
} from "./provider-switch.ts";

const base = { isSaved: false, isInUse: false, isOff: false };

test("a provider shows one of four states, off first", () => {
  assert.equal(describeProviderState(base), "notConfigured");
  assert.equal(describeProviderState({ ...base, isSaved: true }), "connected");
  assert.equal(
    describeProviderState({ ...base, isSaved: true, isInUse: true }),
    "inUse",
  );
  assert.equal(
    describeProviderState({ isSaved: true, isInUse: true, isOff: true }),
    "off",
  );
});

test("the off list keeps each provider once and survives bad storage", () => {
  assert.deepEqual(withProviderOff([], "router", true), ["router"]);
  assert.deepEqual(withProviderOff(["router"], "router", true), ["router"]);
  assert.deepEqual(withProviderOff(["router", "anthropic"], "router", false), [
    "anthropic",
  ]);
  assert.deepEqual(parseOffProviders('["router","nope",7]'), ["router"]);
  assert.deepEqual(parseOffProviders("{bad"), []);
  assert.deepEqual(parseOffProviders('{"a":1}'), []);
  assert.deepEqual(parseOffProviders(null), []);
});

test("a running turn refuses changes to its own provider only", () => {
  assert.equal(refuseWhileRunning("router", "router"), "turnRunning");
  assert.equal(refuseWhileRunning("anthropic", "router"), null);
  assert.equal(refuseWhileRunning("router", null), null);
});

test("a saved off list is valid only as known providers, each once", () => {
  assert.deepEqual(validateOffProviders([]), []);
  assert.deepEqual(validateOffProviders(["anthropic", "router"]), [
    "anthropic",
    "router",
  ]);
  assert.equal(validateOffProviders(["router", "router"]), undefined);
  assert.equal(validateOffProviders(["router", "openai"]), undefined);
  assert.equal(validateOffProviders([7]), undefined);
  assert.equal(validateOffProviders("router"), undefined);
  assert.equal(validateOffProviders(null), undefined);
});
