import assert from "node:assert/strict";
import test from "node:test";
import { createToolRegistry, toolSpecs } from "./tool-registry.ts";
import { fakeTool } from "./tool-loop-fixtures.ts";

test("the registry maps tools by name and refuses duplicates", () => {
  const a = fakeTool({ name: "a" }).tool;
  const b = fakeTool({ name: "b", policy: "ask" }).tool;
  const registry = createToolRegistry([a, b]);
  assert.equal(registry.get("b"), b);
  assert.deepEqual(
    toolSpecs(registry).map((spec) => Object.keys(spec)),
    [
      ["name", "description", "parameters"],
      ["name", "description", "parameters"],
    ],
  );
  assert.throws(() => createToolRegistry([a, a]), /duplicate tool name/);
});

test("v1 tool names fit the OpenAI function-name pattern", async () => {
  const { GITHUB_LIST_OPEN_ITEMS } =
    await import("./server/github-list-open-items.ts");
  const { MEMORY_ADD_NOTE } = await import("./server/memory-add-note.ts");
  for (const name of [GITHUB_LIST_OPEN_ITEMS, MEMORY_ADD_NOTE]) {
    assert.match(name, /^[a-zA-Z0-9_-]{1,64}$/);
  }
});
