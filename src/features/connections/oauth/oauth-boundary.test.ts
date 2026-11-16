import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";

async function restrictedImports(filePath: string, source: string) {
  const code = `import x from "${source}";\nexport { x };\n`;
  const [result] = await new ESLint().lintText(code, { filePath });
  return result.messages.filter(
    (message) => message.ruleId === "no-restricted-imports",
  ).length;
}

const OAUTH = "src/features/connections/oauth/boundary-probe.ts";
const CREDENTIALS = "src/features/connections/credentials/boundary-probe.ts";

test("oauth may import core and its own files only", async () => {
  for (const source of ["../core/index.ts", "./pkce.ts"]) {
    assert.equal(await restrictedImports(OAUTH, source), 0, source);
  }
  for (const source of [
    "node:crypto",
    "next/server",
    "react",
    "../credentials/index.ts",
    "../../key-vault/vault-context.ts",
    "@/features/key-vault/vault-context.ts",
  ]) {
    assert.equal(await restrictedImports(OAUTH, source), 1, source);
  }
});

test("credentials may import core and the key vault only", async () => {
  for (const source of [
    "../core/index.ts",
    "../../key-vault/provider-key-repository.ts",
  ]) {
    assert.equal(await restrictedImports(CREDENTIALS, source), 0, source);
  }
  for (const source of [
    "../oauth/index.ts",
    "../server/index.ts",
    "../../model/model-config.ts",
    "next/server",
    "react",
  ]) {
    assert.equal(await restrictedImports(CREDENTIALS, source), 1, source);
  }
});
