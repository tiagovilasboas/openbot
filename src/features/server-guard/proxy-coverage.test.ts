import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// The request guard takes no path: it gates every request the proxy sees.
// proxy.ts matches "/api/:path*", which spans any depth, so the streaming
// route (/api/chat/stream) gets origin, token, size and rate checks without
// an entry of its own. Pin the matcher so narrowing it fails loudly.
test("the proxy matcher covers nested API paths such as /api/chat/stream", () => {
  const source = readFileSync(
    new URL("../../proxy.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /matcher:\s*"\/api\/:path\*"/);
});
