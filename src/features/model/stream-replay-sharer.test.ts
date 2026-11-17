// What a second request sees when the stream it shares does not finish.
import assert from "node:assert/strict";
import test from "node:test";
import { createStreamReplay } from "./stream-replay.ts";

const encoder = new TextEncoder();
const line = (event: object) => encoder.encode(`${JSON.stringify(event)}\n`);
const DELTA = line({ type: "delta", text: "hi" });
const ERROR = line({ type: "error", code: "unknown", provider: null });

/** A source the test feeds by hand: push lines, then close or leave open. */
function source() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: () => new Response(body),
    push: (chunk: Uint8Array) => controller.enqueue(chunk),
    close: () => controller.close(),
  };
}

function share(options: Parameters<typeof createStreamReplay>[0] = {}) {
  const replay = createStreamReplay(options);
  const upstream = source();
  const run = () => {
    const result = replay.run("send-0001", "fp", upstream.response);
    assert.equal(result.kind, "response");
    return (result as { response: Response }).response;
  };
  return { replay, upstream, first: run(), run };
}

test("a sharer of a cancelled stream gets its lines and then an error line", async () => {
  const s = share();
  s.upstream.push(DELTA);
  const first = s.first.body!.getReader();
  await first.read();
  const second = s.run();
  await first.cancel();
  const text = await second.text();
  const lines = text.trim().split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /"type":"delta"/);
  assert.match(lines[1], /"type":"error"/);
  assert.equal(s.replay.size(), 0);
});

test("a sharer of a stream that ended in an error gets that error once", async () => {
  const s = share();
  s.upstream.push(DELTA);
  s.upstream.push(ERROR);
  s.upstream.close();
  const second = s.run();
  const [a, b] = await Promise.all([s.first.text(), second.text()]);
  assert.equal(a, b);
  assert.equal(b.match(/"type":"error"/g)?.length, 1);
});

test("a sharer of a stream that grew past the cap ends with an error line", async () => {
  const s = share({ maxEntryBytes: DELTA.byteLength });
  const second = s.run();
  s.upstream.push(DELTA);
  s.upstream.push(DELTA);
  s.upstream.close();
  const [a, b] = await Promise.all([s.first.text(), second.text()]);
  assert.equal(a.match(/"type":"delta"/g)?.length, 2);
  assert.equal(b.match(/"type":"delta"/g)?.length, 1);
  assert.match(b.trim().split("\n").at(-1) ?? "", /"type":"error"/);
});

test("a sharer gives up with a timeout when the first reader stops reading", async () => {
  const s = share({ followIdleMs: 20 });
  s.upstream.push(DELTA);
  const first = s.first.body!.getReader();
  await first.read();
  // The first reader never reads again and never cancels.
  const text = await s.run().text();
  const lines = text.trim().split("\n");
  assert.match(lines[0], /"type":"delta"/);
  assert.match(lines.at(-1) ?? "", /"code":"timeout"/);
  await first.cancel();
});

test("a sharer that leaves stops waiting", async () => {
  const s = share({ followIdleMs: 60_000 });
  const reader = s.run().body!.getReader();
  const pending = reader.read();
  await reader.cancel();
  assert.equal((await pending).done, true);
  // The process would hang here on a live timer if the wait were not cleared.
  await s.first.body!.cancel();
});
