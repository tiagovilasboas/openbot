import assert from "node:assert/strict";
import test from "node:test";
import { MAX_FILE_BYTES, MAX_TOTAL_CHARS } from "./attachment-limits.ts";
import { addAttachmentFiles, remainingChars } from "./add-attachments.ts";
import { cutText } from "./decode-text.ts";
import { readAttachment } from "./read-attachment.ts";
import { looksLikeTextFile } from "./text-file-kind.ts";

function textFile(name: string, content: string, type = "") {
  return new File([content], name, { type });
}

function bytesFile(name: string, bytes: number[], type = "") {
  return new File([new Uint8Array(bytes)], name, { type });
}

test("text-like files pass by extension or by text type", () => {
  for (const name of ["a.txt", "b.MD", "c.json", "d.tsx", "e.py", "f.yaml"]) {
    assert.equal(looksLikeTextFile(name, ""), true, name);
  }
  assert.equal(looksLikeTextFile("Dockerfile", ""), true);
  assert.equal(looksLikeTextFile("notes.weird", "text/plain"), true);
});

test("binary-looking names and types are not text", () => {
  assert.equal(looksLikeTextFile("photo.png", "image/png"), false);
  assert.equal(looksLikeTextFile("doc.pdf", "application/pdf"), false);
  assert.equal(looksLikeTextFile("app.exe", ""), false);
  assert.equal(looksLikeTextFile("archive.zip", "application/zip"), false);
  assert.equal(looksLikeTextFile("mystery", ""), false);
});

test("a small text file is read whole", async () => {
  const result = await readAttachment(textFile("notes.md", "# Hi\nthere"));
  assert.ok(result.ok);
  assert.deepEqual(result.attachment, {
    name: "notes.md",
    text: "# Hi\nthere",
    truncated: false,
    chars: 10,
    size: 10,
  });
});

test("a file over the read limit is too_large", async () => {
  const big = textFile("big.log", "a".repeat(MAX_FILE_BYTES + 1));
  assert.deepEqual(await readAttachment(big), {
    ok: false,
    reason: "too_large",
  });
});

test("a file of the wrong kind is not_text before it is read", async () => {
  let read = false;
  const file = {
    name: "pic.png",
    type: "image/png",
    size: 10,
    arrayBuffer: async () => {
      read = true;
      return new ArrayBuffer(10);
    },
  };
  assert.deepEqual(await readAttachment(file), {
    ok: false,
    reason: "not_text",
  });
  assert.equal(read, false);
});

test("a NUL byte in a .txt file means binary", async () => {
  const file = bytesFile("fake.txt", [72, 105, 0, 33]);
  assert.deepEqual(await readAttachment(file), {
    ok: false,
    reason: "not_text",
  });
});

test("invalid UTF-8 means binary", async () => {
  const file = bytesFile("latin1.txt", [0x63, 0x61, 0x66, 0xe9]);
  assert.deepEqual(await readAttachment(file), {
    ok: false,
    reason: "not_text",
  });
});

test("a byte-order mark is dropped and accents survive", async () => {
  const bytes = [0xef, 0xbb, 0xbf, ...new TextEncoder().encode("café")];
  const result = await readAttachment(bytesFile("a.txt", bytes));
  assert.ok(result.ok);
  assert.equal(result.attachment.text, "café");
});

test("stray control characters become spaces, line breaks stay", async () => {
  const result = await readAttachment(textFile("a.txt", "a\u0001b\r\nc\td"));
  assert.ok(result.ok);
  assert.equal(result.attachment.text, "a b\r\nc\td");
});

test("an empty or blank file is rejected as empty", async () => {
  assert.deepEqual(await readAttachment(textFile("a.txt", "")), {
    ok: false,
    reason: "empty",
  });
  assert.deepEqual(await readAttachment(textFile("a.txt", " \n\t ")), {
    ok: false,
    reason: "empty",
  });
});

test("a file that cannot be read is unreadable", async () => {
  const file = {
    name: "a.txt",
    type: "text/plain",
    size: 3,
    arrayBuffer: async () => {
      throw new Error("denied");
    },
  };
  assert.deepEqual(await readAttachment(file), {
    ok: false,
    reason: "unreadable",
  });
});

test("long text is cut to the budget and flagged", async () => {
  const result = await readAttachment(
    textFile("long.txt", "x".repeat(MAX_TOTAL_CHARS + 500)),
  );
  assert.ok(result.ok);
  assert.equal(result.attachment.chars, MAX_TOTAL_CHARS);
  assert.equal(result.attachment.text.length, MAX_TOTAL_CHARS);
  assert.equal(result.attachment.truncated, true);
});

test("the cut respects what is left of the message budget", async () => {
  const result = await readAttachment(textFile("a.txt", "y".repeat(500)), 120);
  assert.ok(result.ok);
  assert.equal(result.attachment.chars, 120);
  assert.equal(result.attachment.truncated, true);
  assert.deepEqual(await readAttachment(textFile("a.txt", "y"), 0), {
    ok: false,
    reason: "too_many",
  });
});

test("a cut never splits a surrogate pair", () => {
  const text = "ab😀cd";
  assert.equal(cutText(text, 3), "ab");
  assert.equal(cutText(text, 4), "ab😀");
  assert.equal(cutText("abc", 10), "abc");
});

test("at most three files go on one message", async () => {
  const files = ["1", "2", "3", "4"].map((n) => textFile(`${n}.txt`, "data"));
  const { attachments, rejected } = await addAttachmentFiles([], files);
  assert.deepEqual(
    attachments.map((a) => a.name),
    ["1.txt", "2.txt", "3.txt"],
  );
  assert.deepEqual(rejected, [{ name: "4.txt", reason: "too_many" }]);
});

test("the character budget is shared across files", async () => {
  const first = textFile("a.txt", "a".repeat(9000));
  const second = textFile("b.txt", "b".repeat(9000));
  const third = textFile("c.txt", "c".repeat(10));
  const { attachments, rejected } = await addAttachmentFiles(
    [],
    [first, second, third],
  );
  assert.deepEqual(
    attachments.map((a) => a.chars),
    [9000, 3000, 10].slice(0, attachments.length),
  );
  assert.equal(attachments[1].truncated, true);
  // The budget is spent after two files, so the third is turned away.
  assert.deepEqual(rejected, [{ name: "c.txt", reason: "too_many" }]);
  assert.equal(remainingChars(attachments), 0);
});

test("a rejected file does not stop the others", async () => {
  const { attachments, rejected } = await addAttachmentFiles(
    [],
    [bytesFile("x.txt", [0, 1]), textFile("ok.txt", "fine")],
  );
  assert.deepEqual(
    attachments.map((a) => a.name),
    ["ok.txt"],
  );
  assert.deepEqual(rejected, [{ name: "x.txt", reason: "not_text" }]);
});
