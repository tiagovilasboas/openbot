import assert from "node:assert/strict";
import test from "node:test";
import { fakeStreamResponse, ndjson } from "./fake-stream-response.ts";
import { requestModelStream } from "./request-model-stream.ts";

const history = [{ role: "user" as const, text: "oi" }];
const delta = (text: string) => ({ type: "delta", text });

function streamOf(...chunks: string[]): typeof fetch {
  return async () => fakeStreamResponse(chunks);
}

test("one huge delta is cut at the cap and kept as a partial reply", async () => {
  const seen: number[] = [];
  const outcome = await requestModelStream(
    "en",
    history,
    streamOf(ndjson(delta("x".repeat(5_000)))),
    null,
    undefined,
    { maxReplyChars: 100, onText: (text) => seen.push(text.length) },
  );
  assert.equal(outcome.kind, "partial");
  assert.equal(outcome.kind === "partial" && outcome.text.length, 100);
  assert.deepEqual(outcome.kind === "partial" && outcome.failure, {
    kind: "response_too_long",
  });
  assert.deepEqual(seen, [100]);
});

test("many short deltas stop at the cap without reading the rest", async () => {
  const lines = Array.from({ length: 1_000 }, () =>
    ndjson(delta("0123456789")),
  );
  const outcome = await requestModelStream(
    "en",
    history,
    streamOf(...lines),
    null,
    undefined,
    { maxReplyChars: 250 },
  );
  assert.equal(outcome.kind, "partial");
  assert.equal(outcome.kind === "partial" && outcome.text.length, 250);
});

test("a stream line past the reader cap is reported as too long, not as unreachable", async () => {
  const outcome = await requestModelStream(
    "en",
    history,
    streamOf(ndjson(delta("ok")), "x".repeat(1_100_000)),
  );
  assert.equal(outcome.kind, "partial");
  assert.deepEqual(outcome.kind === "partial" && outcome.failure, {
    kind: "response_too_long",
  });
});

test("a reply under the cap is untouched", async () => {
  const outcome = await requestModelStream(
    "en",
    history,
    streamOf(
      ndjson(delta("hello "), delta("world"), { type: "done", provider: "p" }),
    ),
    null,
    undefined,
    { maxReplyChars: 11 },
  );
  assert.deepEqual(outcome, { kind: "text", text: "hello world" });
});
