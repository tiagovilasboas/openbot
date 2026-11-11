import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { ClientModelConfig } from "../model/model-config.ts";
import { executeSummary } from "./execute-summary.ts";

const { POST } = await import("../../app/api/chat/route.ts");

const config: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://router.test/v1",
  model: "vendor/global",
};
const request = {
  isSummary: true,
  kind: "repo_summary",
  repo: null,
} as unknown as Parameters<typeof executeSummary>[0];

const realFetch = globalThis.fetch;
let savedAllowed: string | undefined;
beforeEach(() => {
  savedAllowed = process.env.OPENBOT_ALLOWED_MODELS;
  delete process.env.OPENBOT_ALLOWED_MODELS;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  if (savedAllowed === undefined) delete process.env.OPENBOT_ALLOWED_MODELS;
  else process.env.OPENBOT_ALLOWED_MODELS = savedAllowed;
});

/** Runs a summary and returns the body it sent to /api/chat. */
async function sentBody(modelId?: string): Promise<Record<string, unknown>> {
  let body: Record<string, unknown> = {};
  const fakeFetch: typeof fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return Response.json({ text: "model summary" });
  };
  await executeSummary(
    request,
    "en",
    "summarize",
    null,
    config,
    fakeFetch,
    modelId,
  );
  return body;
}

test("the summary request carries the active bot's modelId", async () => {
  const body = await sentBody("vendor/bot-model");
  assert.equal(body.modelId, "vendor/bot-model");
});

test("without a bot model the summary sends no modelId", async () => {
  assert.equal("modelId" in (await sentBody()), false);
});

test("the chat route rejects a summary modelId outside the allow-list", async () => {
  process.env.OPENBOT_ALLOWED_MODELS = "vendor/ok";
  const body = await sentBody("vendor/not-listed");
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "model_not_allowed" });
});
