export type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string }
  | { type: "italic"; text: string };

export function parseInlineTokens(text: string): InlineToken[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = text.split(pattern);

  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return { type: "bold", text: part.slice(2, -2) };
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return { type: "code", text: part.slice(1, -1) };
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        return { type: "italic", text: part.slice(1, -1) };
      }
      return { type: "text", text: part };
    });
}

export type Block =
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

export function parseBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let currentList: string[] = [];

  function flushList() {
    if (currentList.length > 0) {
      blocks.push({ type: "list", items: [...currentList] });
      currentList = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push({ type: "h3", text: trimmed.slice(4) });
    } else if (trimmed.startsWith("#### ")) {
      flushList();
      blocks.push({ type: "h4", text: trimmed.slice(5) });
    } else if (trimmed.startsWith("> ")) {
      flushList();
      blocks.push({ type: "quote", text: trimmed.slice(2) });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      currentList.push(trimmed.slice(2));
    } else {
      flushList();
      blocks.push({ type: "paragraph", text: trimmed });
    }
  }

  flushList();
  return blocks;
}
