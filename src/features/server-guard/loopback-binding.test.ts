import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Without a proxy, the guard can only tell loopback callers by the
// X-Forwarded-For header, which a remote client can forge. Listening on
// loopback by default means no remote client reaches the server at all
// unless the owner opts in with -H and sets OPENBOT_ACCESS_TOKEN.

const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts as {
  dev: string;
  start: string;
};

for (const name of ["dev", "start"] as const) {
  test(`npm run ${name} listens only on 127.0.0.1`, () => {
    assert.match(scripts[name], /^next (dev|start) -H 127\.0\.0\.1$/);
  });
}

test("the real-model run script binds its dev server to 127.0.0.1", () => {
  const script = readFileSync("scripts/run-real-model.sh", "utf8");
  assert.match(script, /next dev -H 127\.0\.0\.1 -p \$PORT/);
});
