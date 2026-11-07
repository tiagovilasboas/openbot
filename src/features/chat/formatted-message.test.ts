import assert from "node:assert/strict";
import test from "node:test";
import { parseBlocks, parseInlineTokens } from "./parse-markdown-blocks.ts";

test("parseBlocks extracts h3, h4, quotes, lists, and paragraphs", () => {
  const raw = `### ☀️ Briefing Diário

Visão Geral:
- Item 1
- Item 2

> ⚠️ Falha Parcial: Limite de requisições

#### 💡 Sugestões de Ação
Parágrafo final.`;

  const blocks = parseBlocks(raw);

  assert.equal(blocks.length, 6);
  assert.deepEqual(blocks[0], { type: "h3", text: "☀️ Briefing Diário" });
  assert.deepEqual(blocks[1], { type: "paragraph", text: "Visão Geral:" });
  assert.deepEqual(blocks[2], { type: "list", items: ["Item 1", "Item 2"] });
  assert.deepEqual(blocks[3], {
    type: "quote",
    text: "⚠️ Falha Parcial: Limite de requisições",
  });
  assert.deepEqual(blocks[4], {
    type: "h4",
    text: "💡 Sugestões de Ação",
  });
  assert.deepEqual(blocks[5], {
    type: "paragraph",
    text: "Parágrafo final.",
  });
});

test("parseInlineTokens extracts bold, code, italic, and plain text", () => {
  const tokens = parseInlineTokens(
    "Texto com **negrito**, `código` e *itálico*.",
  );

  assert.deepEqual(tokens, [
    { type: "text", text: "Texto com " },
    { type: "bold", text: "negrito" },
    { type: "text", text: ", " },
    { type: "code", text: "código" },
    { type: "text", text: " e " },
    { type: "italic", text: "itálico" },
    { type: "text", text: "." },
  ]);
});

test("parseBlocks handles empty or single paragraph text", () => {
  assert.deepEqual(parseBlocks(""), []);
  assert.deepEqual(parseBlocks("Olá mundo"), [
    { type: "paragraph", text: "Olá mundo" },
  ]);
});
