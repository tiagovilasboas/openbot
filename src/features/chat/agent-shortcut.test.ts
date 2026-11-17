import assert from "node:assert/strict";
import test from "node:test";

import type { BotProfile } from "@/features/bots/bot-types.ts";
import {
  agentAtShortcut,
  agentShortcutHint,
  agentShortcutNumber,
  isTypingTarget,
  type ShortcutKeyEvent,
} from "./agent-shortcut.ts";

function key(code: string, extra: Partial<ShortcutKeyEvent> = {}) {
  return {
    code,
    altKey: true,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...extra,
  };
}

function bot(id: string, hidden?: boolean): BotProfile {
  return { id, name: id, hidden } as BotProfile;
}

test("Alt plus a digit from 1 to 9 names the slot", () => {
  assert.equal(agentShortcutNumber(key("Digit1")), 1);
  assert.equal(agentShortcutNumber(key("Digit9")), 9);
  assert.equal(agentShortcutNumber(key("Numpad4")), 4);
});

test("zero, letters and other modifier mixes are not shortcuts", () => {
  assert.equal(agentShortcutNumber(key("Digit0")), null);
  assert.equal(agentShortcutNumber(key("KeyA")), null);
  assert.equal(agentShortcutNumber(key("Digit1", { altKey: false })), null);
  assert.equal(agentShortcutNumber(key("Digit1", { ctrlKey: true })), null);
  assert.equal(agentShortcutNumber(key("Digit1", { metaKey: true })), null);
  assert.equal(agentShortcutNumber(key("Digit1", { shiftKey: true })), null);
});

test("a held key and an IME composition do not repeat the switch", () => {
  assert.equal(agentShortcutNumber(key("Digit2", { repeat: true })), null);
  assert.equal(agentShortcutNumber(key("Digit2", { isComposing: true })), null);
});

test("the slot follows the visible list and skips hidden agents", () => {
  const bots = [bot("a"), bot("b", true), bot("c"), bot("d")];
  assert.equal(agentAtShortcut(bots, 1)?.id, "a");
  assert.equal(agentAtShortcut(bots, 2)?.id, "c");
  assert.equal(agentAtShortcut(bots, 3)?.id, "d");
  assert.equal(agentAtShortcut(bots, 4), undefined);
});

test("only the first nine agents are reachable", () => {
  const bots = Array.from({ length: 12 }, (_, i) => bot(`b${i}`));
  assert.equal(agentAtShortcut(bots, 9)?.id, "b8");
  assert.equal(agentAtShortcut(bots, 10), undefined);
  assert.equal(agentAtShortcut(bots, 0), undefined);
});

test("rows show digits 1 to 9 and nothing after", () => {
  assert.equal(agentShortcutHint(0), "1");
  assert.equal(agentShortcutHint(8), "9");
  assert.equal(agentShortcutHint(9), undefined);
  assert.equal(agentShortcutHint(-1), undefined);
});

test("text fields and editable regions count as typing", () => {
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" } as never), true);
  assert.equal(isTypingTarget({ tagName: "input" } as never), true);
  assert.equal(
    isTypingTarget({ tagName: "DIV", isContentEditable: true } as never),
    true,
  );
  assert.equal(isTypingTarget({ tagName: "BUTTON" } as never), false);
  assert.equal(isTypingTarget(null), false);
});
