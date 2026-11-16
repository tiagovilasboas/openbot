import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";

const CLIENT = "src/features/connections/client/boundary-probe.ts";

async function restrictedImports(source: string): Promise<number> {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(
    `import x from "${source}";\nexport { x };\n`,
    { filePath: CLIENT },
  );
  return result.messages.filter(
    (message) => message.ruleId === "no-restricted-imports",
  ).length;
}

test("the client may import core and server-guard", async () => {
  assert.equal(await restrictedImports("../core/index.ts"), 0);
  assert.equal(
    await restrictedImports("../../server-guard/api-request-init.ts"),
    0,
  );
});

test("the client never reaches UI, server wiring or flow internals", async () => {
  for (const source of [
    "react",
    "../panel/ConnectNotice.tsx",
    "../server/index.ts",
    "../oauth/index.ts",
    "../credentials/index.ts",
    "../api-key/manage-connection.ts",
  ]) {
    assert.equal(await restrictedImports(source), 1, source);
  }
});
