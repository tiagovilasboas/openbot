import { LANGUAGES } from "../language/language.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { getMemoryCopy } from "./memory-copy.ts";

function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value === "string" || typeof value === "function") {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k),
  );
}

test("memory copy has the same keys in every language", () => {
  for (const language of LANGUAGES) {
    assert.deepEqual(
      flatten(getMemoryCopy(language)),
      flatten(getMemoryCopy("pt")),
    );
  }
});

test("no memory text is empty and the counter names the limit", () => {
  for (const language of LANGUAGES) {
    const copy = getMemoryCopy(language);
    for (const error of Object.values(copy.errors)) assert.ok(error.length > 0);
    assert.ok(copy.deviceNote.length > 0);
    assert.match(copy.counter(3), /3.*30/);
  }
});

test("the device note says it stays here and goes to the model", () => {
  assert.match(getMemoryCopy("pt").deviceNote, /neste aparelho/);
  assert.match(getMemoryCopy("pt").deviceNote, /enviadas ao modelo/);
  assert.match(getMemoryCopy("en").deviceNote, /this device/);
  assert.match(getMemoryCopy("en").deviceNote, /sent to the model/);
  assert.match(getMemoryCopy("es").deviceNote, /este dispositivo/);
  assert.match(getMemoryCopy("es").deviceNote, /se envían al modelo/);
});
