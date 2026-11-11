import assert from "node:assert/strict";
import test from "node:test";
import { FORMAT_LOCALE, HTML_LANG, isLanguage, LANGUAGES } from "./language.ts";

test("only the supported languages are accepted", () => {
  for (const language of LANGUAGES) assert.equal(isLanguage(language), true);
  for (const other of ["fr", "", "ES", "pt-BR", null, undefined, 3]) {
    assert.equal(isLanguage(other), false);
  }
});

test("every language has a lang tag and a format locale", () => {
  for (const language of LANGUAGES) {
    assert.ok(HTML_LANG[language]);
    assert.ok(FORMAT_LOCALE[language]);
  }
  assert.equal(HTML_LANG.es, "es-419");
});
