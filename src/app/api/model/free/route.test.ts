import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route.ts";

test("GET /api/model/free returns a list of free models including openrouter/free", async () => {
  const response = await GET();
  assert.equal(response.status, 200);

  const data = (await response.json()) as {
    ok: boolean;
    source: string;
    models: Array<{ id: string; name: string }>;
  };

  assert.equal(data.ok, true);
  assert.ok(["live", "fallback", "cache"].includes(data.source));
  assert.ok(Array.isArray(data.models));
  assert.ok(data.models.length > 0);

  // Auto Free Router is always present
  const autoFree = data.models.find((m) => m.id === "openrouter/free");
  assert.ok(autoFree, "openrouter/free should always be present");

  // Every model in the list is either openrouter/free or ends with :free
  for (const model of data.models) {
    assert.ok(
      model.id === "openrouter/free" || model.id.endsWith(":free"),
      `model ${model.id} should end with :free or be openrouter/free`,
    );
  }
});
