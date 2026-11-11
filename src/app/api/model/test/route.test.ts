import assert from "node:assert/strict";
import test from "node:test";
import { POST as chatPost } from "../../chat/route.ts";
import { POST as testPost } from "./route.ts";
import "../../../../shared/testing/temp-data-dir.mjs";

const blockedConfig = {
  provider: "router",
  baseUrl: "http://169.254.169.254/latest/meta-data",
  model: "m",
  apiKey: "sk-test-secret",
};

function post(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("POST /api/model/test answers 400 blocked_base_url for metadata IPs", async () => {
  const response = await testPost(
    post("/api/model/test", { config: blockedConfig }),
  );
  assert.equal(response.status, 400);
  const text = await response.text();
  const body = JSON.parse(text);
  assert.equal(body.ok, false);
  assert.equal(body.error, "blocked_base_url");
  assert.ok(!text.includes("169.254") && !text.includes("sk-test-secret"));
});

test("POST /api/chat answers 400 blocked_base_url for private networks", async () => {
  const response = await chatPost(
    post("/api/chat", {
      language: "en",
      messages: [{ role: "user", text: "hi" }],
      config: { ...blockedConfig, baseUrl: "http://192.168.0.1:8080/v1" },
    }),
  );
  assert.equal(response.status, 400);
  const text = await response.text();
  assert.equal(JSON.parse(text).error, "blocked_base_url");
  assert.ok(!text.includes("192.168") && !text.includes("sk-test-secret"));
});

test("a client fallback config pointing at a private host is blocked too", async () => {
  const response = await chatPost(
    post("/api/chat", {
      language: "en",
      messages: [{ role: "user", text: "hi" }],
      config: { ...blockedConfig, baseUrl: "http://10.0.0.1/v1" },
      fallbackConfig: { ...blockedConfig, baseUrl: "http://172.16.0.1/v1" },
    }),
  );
  assert.equal(response.status, 400);
});
