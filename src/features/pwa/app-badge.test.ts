import assert from "node:assert/strict";
import test from "node:test";

import { appBadgePort, syncAppBadge, type AppBadgePort } from "./app-badge.ts";

function recordingPort() {
  const calls: string[] = [];
  const port: AppBadgePort = {
    set: async (n) => void calls.push(`set ${n}`),
    clear: async () => void calls.push("clear"),
  };
  return { calls, port };
}

test("a browser without the Badging API gives no port", () => {
  assert.equal(appBadgePort({}), null);
  assert.equal(appBadgePort(undefined), null);
});

test("the port sets and clears through the navigator", async () => {
  const calls: string[] = [];
  const port = appBadgePort({
    setAppBadge: async (n) => void calls.push(`set ${n}`),
    clearAppBadge: async () => void calls.push("clear"),
  });
  await port?.set(3);
  await port?.clear();
  assert.deepEqual(calls, ["set 3", "clear"]);
});

test("without clearAppBadge the port clears by setting 0", async () => {
  const calls: string[] = [];
  const port = appBadgePort({
    setAppBadge: async (n) => void calls.push(`set ${n}`),
  });
  await port?.clear();
  assert.deepEqual(calls, ["set 0"]);
});

test("a total above 0 is shown on the icon", async () => {
  const { calls, port } = recordingPort();
  await syncAppBadge(port, 4);
  assert.deepEqual(calls, ["set 4"]);
});

test("a total of 0 clears the icon", async () => {
  const { calls, port } = recordingPort();
  await syncAppBadge(port, 0);
  assert.deepEqual(calls, ["clear"]);
});

test("no port means nothing happens", async () => {
  await assert.doesNotReject(syncAppBadge(null, 5));
});

test("a refused badge never throws", async () => {
  const port: AppBadgePort = {
    set: async () => {
      throw new Error("denied");
    },
    clear: async () => {
      throw new Error("denied");
    },
  };
  await assert.doesNotReject(syncAppBadge(port, 2));
  await assert.doesNotReject(syncAppBadge(port, 0));
});
