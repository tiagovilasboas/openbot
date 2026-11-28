import assert from "node:assert/strict";
import { test } from "node:test";
import { parseConnectReturn, withoutConnectParams } from "./connect-return.ts";

test("reads a successful return", () => {
  assert.deepEqual(parseConnectReturn("?connect=router&state=s&code=c"), {
    id: "router",
    state: "s",
    code: "c",
  });
  assert.deepEqual(
    parseConnectReturn("?connect=chatgpt&state=s&code=c&client_id=oaiapp_123"),
    {
      id: "chatgpt",
      state: "s",
      code: "c",
      clientId: "oaiapp_123",
    },
  );
});

test("reads a declined return without a code", () => {
  assert.deepEqual(
    parseConnectReturn("?connect=router&state=s&error=access_denied"),
    { id: "router", state: "s", error: "access_denied" },
  );
});

test("ignores locations that are not a connect return", () => {
  assert.equal(parseConnectReturn(""), null);
  assert.equal(parseConnectReturn("?state=s&code=c"), null);
  assert.equal(parseConnectReturn("?connect=nope&state=s"), null);
});

test("strips only the connect params and keeps the rest", () => {
  assert.equal(
    withoutConnectParams(
      "/",
      "?connect=router&state=s&code=c&client_id=oaiapp_1&x=1",
      "#top",
    ),
    "/?x=1#top",
  );
  assert.equal(
    withoutConnectParams("/chat", "?connect=router&state=s", ""),
    "/chat",
  );
});
