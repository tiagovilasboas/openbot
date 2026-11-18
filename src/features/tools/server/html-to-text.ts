const SKIPPED = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "iframe",
  "object",
  "embed",
]);
const BLOCKS = new Set([
  "p",
  "div",
  "br",
  "li",
  "ul",
  "ol",
  "tr",
  "table",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "main",
  "aside",
  "blockquote",
  "pre",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "form",
  "dt",
  "dd",
  "figure",
]);
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  copy: "©",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (whole, body: string) => {
      if (body[0] === "#") {
        const code =
          body[1].toLowerCase() === "x"
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
        return code > 0 &&
          code <= 0x10ffff &&
          !(code >= 0xd800 && code <= 0xdfff)
          ? String.fromCodePoint(code)
          : "";
      }
      return ENTITIES[body.toLowerCase()] ?? whole;
    },
  );
}

function collapse(text: string): string {
  return text
    .replace(/[ \t\f\v\r ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export type PageText = { title: string; text: string };

/**
 * Reduces HTML to readable text in one linear pass: drops scripts, styles,
 * comments and other non-content elements, breaks lines at block elements,
 * strips every tag, decodes entities and collapses whitespace. Plain text
 * passes through with the same whitespace cleanup. Never executes anything.
 */
export function htmlToText(html: string): PageText {
  const lower = html.toLowerCase();
  let title = "";
  let out = "";
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    if (lower.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      if (end === -1) break;
      i = end + 3;
      continue;
    }
    const match = /^<(\/?)([a-z][a-z0-9-]*)/.exec(lower.slice(lt, lt + 40));
    if (!match) {
      // A stray "<" that is not a tag, or "<!doctype" and "<?xml".
      const bang = /^<[!?]/.test(lower.slice(lt, lt + 2));
      if (bang) {
        const end = html.indexOf(">", lt);
        if (end === -1) break;
        i = end + 1;
      } else {
        out += "<";
        i = lt + 1;
      }
      continue;
    }
    const [, closing, name] = match;
    const tagEnd = html.indexOf(">", lt);
    if (tagEnd === -1) break;
    i = tagEnd + 1;
    if (closing) {
      if (BLOCKS.has(name)) out += "\n";
      continue;
    }
    if (name === "title" && !title) {
      const end = lower.indexOf("</title", i);
      const stop = end === -1 ? html.length : end;
      title = collapse(decodeEntities(html.slice(i, stop)).replace(/\n/g, " "));
      i = stop;
      continue;
    }
    if (SKIPPED.has(name)) {
      const end = lower.indexOf(`</${name}`, i);
      if (end === -1) break;
      const close = html.indexOf(">", end);
      i = close === -1 ? html.length : close + 1;
      continue;
    }
    if (BLOCKS.has(name)) out += "\n";
  }
  return { title, text: collapse(decodeEntities(out)) };
}
