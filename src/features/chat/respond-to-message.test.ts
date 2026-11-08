import assert from "node:assert/strict";
import test from "node:test";
import {
  getUnconfiguredModelMessage,
  respondToMessage,
} from "./respond-to-message.ts";

test("declares transparently that no model is configured in Portuguese and English", () => {
  const pt = respondToMessage("qualquer mensagem", "pt");
  assert.equal(pt.kind, "unconfigured");
  assert.equal(
    pt.text,
    "Nenhum modelo configurado. Conecte um modelo em Configurações.",
  );

  const en = respondToMessage("any message", "en");
  assert.equal(en.kind, "unconfigured");
  assert.equal(en.text, "No model configured. Connect a model in Settings.");
});

test("getUnconfiguredModelMessage returns truthful message without mocks", () => {
  assert.match(getUnconfiguredModelMessage("pt"), /Nenhum modelo configurado/);
  assert.match(getUnconfiguredModelMessage("en"), /No model configured/);
});
