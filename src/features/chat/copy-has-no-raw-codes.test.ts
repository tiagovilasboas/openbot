import assert from "node:assert/strict";
import test from "node:test";

import { connectionsCopy } from "../connections/connections-copy.ts";
import { settingsCopy } from "../model/settings-copy.ts";
import { chatCopy } from "./chat-copy.ts";

// Internal codes look like provider_rejected: lowercase words joined by "_".
const RAW_CODE = /\b[a-z]+(?:_[a-z]+)+\b/;

function strings(value: unknown, path: string): Array<[string, string]> {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) =>
      strings(inner, `${path}.${key}`),
    );
  }
  return [];
}

test("no user-facing copy shows an internal snake_case code", () => {
  const dictionaries = { chatCopy, settingsCopy, connectionsCopy };
  const offenders = strings(dictionaries, "copy").filter(([, text]) =>
    RAW_CODE.test(text),
  );
  assert.deepEqual(offenders, []);
});

test("the scan does catch a raw code", () => {
  assert.ok(RAW_CODE.test("Falha: provider_rejected (401)"));
  assert.ok(!RAW_CODE.test("Falha: o provedor recusou a chave"));
});

test("every failure sentence has an action, in both languages", () => {
  for (const language of ["pt", "en"] as const) {
    const c = chatCopy[language];
    for (const text of [
      c.modelErrorOffline,
      c.modelErrorTimeout,
      c.modelErrorServer,
      c.modelErrorUnreachable,
    ]) {
      assert.ok(text.length > 20, text);
    }
    assert.ok(c.cancelLabel && c.cancelledNote && c.retryAction);
  }
});
