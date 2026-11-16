import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConnectFailure, ConnectState } from "../core/index.ts";
import { describeConnectState } from "./describe-connect-state.ts";

const LANGUAGES = ["pt", "en", "es"] as const;
const FAILURES: ConnectFailure[] = [
  "denied",
  "invalid_key",
  "state_mismatch",
  "network",
  "unavailable",
];

test("idle has no notice", () => {
  assert.equal(
    describeConnectState({ phase: "idle" }, "OpenRouter", "en"),
    null,
  );
});

test("every phase and failure has its own sentence in every language", () => {
  const states: ConnectState[] = [
    { phase: "starting" },
    { phase: "waiting" },
    { phase: "verifying" },
    { phase: "connected", accountLabel: null },
    { phase: "expired" },
    ...FAILURES.map((reason) => ({ phase: "failed", reason }) as ConnectState),
  ];
  for (const language of LANGUAGES) {
    const messages = states.map((state) => {
      const view = describeConnectState(state, "OpenRouter", language);
      assert.ok(view, `${language} ${state.phase}`);
      assert.ok(view.message.length > 0);
      assert.doesNotMatch(view.message, /[{}]/, "no unfilled placeholder");
      return view.message;
    });
    assert.equal(new Set(messages).size, messages.length, language);
  }
});

test("progress cannot be dismissed, outcomes can", () => {
  assert.equal(
    describeConnectState({ phase: "waiting" }, "OpenRouter", "pt")?.dismissible,
    false,
  );
  assert.equal(
    describeConnectState({ phase: "expired" }, "OpenRouter", "pt")?.tone,
    "error",
  );
  assert.equal(
    describeConnectState(
      { phase: "connected", accountLabel: null },
      "OpenRouter",
      "pt",
    )?.dismissible,
    true,
  );
});
