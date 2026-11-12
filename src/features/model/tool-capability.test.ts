import assert from "node:assert/strict";
import test from "node:test";
import { pickFreeTextModels } from "./free-model-catalog.ts";
import type { ClientModelConfig } from "./model-config.ts";
import { toolCapability } from "./tool-capability.ts";

const router: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://example.test/v1",
  model: "m",
};
const local: ClientModelConfig = {
  provider: "local",
  baseUrl: "http://localhost:11434",
  model: "m",
};
const anthropic: ClientModelConfig = { provider: "anthropic", model: "m" };

test("router is native only when the catalog entry says it supports tools", () => {
  assert.equal(toolCapability(router, { supportsTools: true }), "native");
  assert.equal(toolCapability(router, { supportsTools: false }), "none");
  assert.equal(toolCapability(router, {}), "none");
  assert.equal(toolCapability(router), "none");
});

test("local, anthropic and no config are none", () => {
  assert.equal(toolCapability(local, { supportsTools: true }), "none");
  assert.equal(toolCapability(anthropic, { supportsTools: true }), "none");
  assert.equal(toolCapability(undefined, { supportsTools: true }), "none");
});

test("the catalog fills supportsTools from supported_parameters", () => {
  const picked = pickFreeTextModels({
    data: [
      {
        id: "a:free",
        name: "A",
        supported_parameters: ["temperature", "tools"],
      },
      { id: "b:free", name: "B", supported_parameters: ["temperature"] },
      { id: "c:free", name: "C" },
      { id: "d:free", name: "D", supported_parameters: "tools" },
    ],
  });
  const flag = (id: string) => picked?.find((item) => item.id === id);
  assert.equal(flag("a:free")?.supportsTools, true);
  assert.equal(flag("b:free")?.supportsTools, false);
  assert.equal(flag("c:free")?.supportsTools, undefined);
  assert.equal(flag("d:free")?.supportsTools, undefined);
});
