import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";

const CORE_FILE = "src/features/connections/core/boundary-probe.ts";

async function restrictedImports(code: string): Promise<number> {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(code, { filePath: CORE_FILE });
  return result.messages.filter(
    (message) => message.ruleId === "no-restricted-imports",
  ).length;
}

test("core may import its sibling files", async () => {
  const code = 'import { IDLE } from "./connect-state.ts";\nexport { IDLE };\n';
  assert.equal(await restrictedImports(code), 0);
});

test("core may not import frameworks, runtime or other features", async () => {
  for (const source of [
    "react",
    "next/server",
    "node:crypto",
    "@heroui/react",
    "@/features/key-vault/vault-context.ts",
    "../../key-vault/vault-context.ts",
    "../api-key/flow.ts",
  ]) {
    const code = `import x from "${source}";\nexport { x };\n`;
    assert.equal(await restrictedImports(code), 1, source);
  }
});
