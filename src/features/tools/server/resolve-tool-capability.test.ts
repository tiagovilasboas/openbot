import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogCapability } from "./resolve-tool-capability.ts";

const catalog = [
  { id: "tools/model:free", name: "T", contextLength: 1, supportsTools: true },
  { id: "plain/model:free", name: "P", contextLength: 1, supportsTools: false },
];

function lookupWithCount() {
  let calls = 0;
  const lookup = createCatalogCapability(async () => {
    calls += 1;
    return { models: catalog };
  });
  return { lookup, calls: () => calls };
}

const routerEnv = {
  ROUTER_URL: "https://openrouter.ai/api/v1",
  ROUTER_MODEL: "tools/model:free",
};

test("a client router config uses the catalog flag", async () => {
  const { lookup } = lookupWithCount();
  const config = {
    provider: "router" as const,
    baseUrl: "https://openrouter.ai/api/v1",
    model: "tools/model:free",
  };
  assert.equal(await lookup(config, undefined, {}), "native");
  assert.equal(await lookup(config, "plain/model:free", {}), "none");
});

test("with no client config the server router env decides", async () => {
  const { lookup } = lookupWithCount();
  assert.equal(await lookup(undefined, undefined, routerEnv), "native");
  assert.equal(
    await lookup(undefined, undefined, {
      ...routerEnv,
      ROUTER_MODEL: "plain/model:free",
    }),
    "none",
  );
  assert.equal(await lookup(undefined, "plain/model:free", routerEnv), "none");
});

test("a local env endpoint wins over the router, as in selectAdapter", async () => {
  const { lookup, calls } = lookupWithCount();
  const env = {
    ...routerEnv,
    LOCAL_MODEL_URL: "http://127.0.0.1:11434",
    LOCAL_MODEL_NAME: "llama",
  };
  assert.equal(await lookup(undefined, undefined, env), "none");
  assert.equal(calls(), 0);
});

test("no router anywhere never fetches the catalog", async () => {
  const { lookup, calls } = lookupWithCount();
  assert.equal(await lookup(undefined, undefined, {}), "none");
  assert.equal(
    await lookup(
      { provider: "anthropic", model: "m" } as never,
      undefined,
      routerEnv,
    ),
    "none",
  );
  assert.equal(calls(), 0);
});
