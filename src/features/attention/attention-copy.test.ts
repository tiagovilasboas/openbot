import assert from "node:assert/strict";
import test from "node:test";

import { attentionLabel, attentionPillText } from "./attention-copy.ts";

test("the label says how many replies are new, in pt and en", () => {
  assert.equal(attentionLabel("pt", 1), "1 resposta nova");
  assert.equal(attentionLabel("pt", 3), "3 respostas novas");
  assert.equal(attentionLabel("en", 1), "1 new reply");
  assert.equal(attentionLabel("en", 3), "3 new replies");
});

test("the pill never grows past two characters", () => {
  assert.equal(attentionPillText(4), "4");
  assert.equal(attentionPillText(9), "9");
  assert.equal(attentionPillText(10), "9+");
  assert.equal(attentionPillText(99), "9+");
});
