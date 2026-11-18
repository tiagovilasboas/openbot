import assert from "node:assert/strict";
import test from "node:test";
import { htmlToText } from "./html-to-text.ts";

test("extracts the title and drops scripts, styles and comments", () => {
  const page = htmlToText(
    `<!doctype html><html><head><title> A &amp; B </title>
     <style>body{color:red}</style><script>alert("x")</script></head>
     <body><!-- hidden --><h1>Hello</h1><p>One <b>two</b></p>
     <script>var a = "<p>no</p>";</script><noscript>nojs</noscript></body></html>`,
  );
  assert.equal(page.title, "A & B");
  assert.equal(page.text, "Hello\nOne two");
});

test("breaks lines at blocks, decodes entities and collapses whitespace", () => {
  const { text } = htmlToText(
    "<div>a   &lt;b&gt;&nbsp;c</div><ul><li>x</li><li>y</li></ul>&#65;&#x42;&bogus;<br><br><br><br>end",
  );
  assert.equal(text, "a <b> c\nx\ny\nAB&bogus;\nend");
});

test("invalid numeric entities and stray angle brackets are safe", () => {
  assert.equal(htmlToText("a &#0; b &#xD800; c &#1114112; d").text, "a b c d");
  assert.equal(htmlToText("1 < 2 and 3 <4").text, "1 < 2 and 3 <4");
});

test("unterminated tags, comments and scripts end the output without hanging", () => {
  assert.equal(htmlToText("keep<p>then <b").text, "keep\nthen");
  assert.equal(htmlToText("keep<!-- never closed").text, "keep");
  assert.equal(htmlToText("keep<script>never closed").text, "keep");
  const many = "<script>".repeat(100_000);
  const started = Date.now();
  assert.equal(htmlToText(many).text, "");
  assert.ok(Date.now() - started < 2_000);
});

test("markup never survives in the text", () => {
  const { text } = htmlToText(
    `<a href="javascript:x" onclick="y()">link</a><img src=x onerror=z><iframe src=//e></iframe>ok`,
  );
  assert.equal(text, "linkok");
});

test("plain text passes through with whitespace cleaned", () => {
  assert.equal(
    htmlToText("  one \t two\r\n\n\n\nthree ").text,
    "one two\nthree",
  );
});
