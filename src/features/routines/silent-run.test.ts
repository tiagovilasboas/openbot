import assert from "node:assert/strict";
import { test } from "node:test";
import { isNothingNew, NO_UPDATE_MARKER, routinePrompt } from "./silent-run.ts";

test("a silent routine prompt carries the marker rule in its language", () => {
  assert.equal(routinePrompt("Veja os PRs", false, "pt"), "Veja os PRs");
  assert.match(
    routinePrompt("Veja os PRs", true, "pt"),
    /nada novo.*\[\[no-update\]\]/,
  );
  assert.match(routinePrompt("Check PRs", true, "en"), /nothing new/);
  assert.match(routinePrompt("Revisa", true, "es"), /nada nuevo/);
});

test("only a reply that is just the marker is nothing new", () => {
  assert.equal(isNothingNew(NO_UPDATE_MARKER), true);
  assert.equal(isNothingNew("  [[NO-UPDATE]]\n"), true);
  assert.equal(isNothingNew("[SILENT]"), true);
  assert.equal(isNothingNew(`Two PRs merged. ${NO_UPDATE_MARKER}`), false);
  assert.equal(isNothingNew(""), false);
});
