import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";

async function restrictedImports(
  code: string,
  filePath: string,
): Promise<number> {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter(
    (message) => message.ruleId === "no-restricted-imports",
  ).length;
}

function importOf(source: string): string {
  return `import x from "${source}";\nexport { x };\n`;
}

const OUTSIDE = "src/features/model/boundary-probe.ts";
const PANEL = "src/features/connections/panel/boundary-probe.ts";
const API_KEY = "src/features/connections/api-key/boundary-probe.ts";

test("other features import connections through its index only", async () => {
  assert.equal(
    await restrictedImports(
      importOf("@/features/connections/index.ts"),
      OUTSIDE,
    ),
    0,
  );
  for (const source of [
    "@/features/connections/panel/ConnectionsPanel.tsx",
    "@/features/connections/api-key/manage-connection.ts",
    "@/features/connections/core/index.ts",
    "../connections/panel/ConnectionRow.tsx",
  ]) {
    assert.equal(await restrictedImports(importOf(source), OUTSIDE), 1, source);
  }
});

test("the React-free copy entry is public", async () => {
  assert.equal(
    await restrictedImports(importOf("../connections/copy.ts"), OUTSIDE),
    0,
  );
  assert.equal(
    await restrictedImports(
      importOf("../connections/panel/connections-copy.ts"),
      OUTSIDE,
    ),
    1,
  );
});

test("the panel uses core, its files and the key flow's functions", async () => {
  for (const source of [
    "../core/index.ts",
    "./connection-catalog.ts",
    "../api-key/manage-connection.ts",
    "@/shared/ui/FormField.tsx",
  ]) {
    assert.equal(await restrictedImports(importOf(source), PANEL), 0, source);
  }
});

test("the panel may not reach server wiring, other flows or credentials", async () => {
  for (const source of [
    "node:crypto",
    "../server/handlers.ts",
    "../oauth/pkce.ts",
    "../credentials/vault-store.ts",
    "../api-key/describe-internals.ts",
  ]) {
    assert.equal(await restrictedImports(importOf(source), PANEL), 1, source);
  }
});

test("the key flow may not import UI or server wiring", async () => {
  assert.equal(
    await restrictedImports(importOf("../core/index.ts"), API_KEY),
    0,
  );
  for (const source of [
    "react",
    "../panel/ConnectionRow.tsx",
    "../server/x.ts",
  ]) {
    assert.equal(await restrictedImports(importOf(source), API_KEY), 1, source);
  }
});
