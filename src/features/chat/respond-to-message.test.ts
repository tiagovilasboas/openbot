import assert from "node:assert/strict";
import test from "node:test";
import { respondToMessage } from "./respond-to-message.ts";

test("a calendar request returns explicitly fictional read-only events", () => {
  const reply = respondToMessage("Me mostre eventos de exemplo", "pt");

  assert.equal(reply.kind, "calendar");
  if (reply.kind !== "calendar") return;
  assert.equal(reply.events.length, 2);
  assert.equal(reply.events[0].time, "10:00");
  assert.equal(reply.events[0].date, null);
  assert.equal(reply.events[0].fictional, true);
});

test("an ordinary message does not invoke the calendar tool", () => {
  const reply = respondToMessage("Olá, como você funciona?", "pt");

  assert.equal(reply.kind, "text");
  assert.match(reply.text, /ainda não usa um modelo/);
});

test("calendar matching handles English and accented Portuguese", () => {
  assert.equal(respondToMessage("Show my schedule", "en").kind, "calendar");
  const portuguese = respondToMessage("Meus compromíssos", "pt");
  assert.equal(portuguese.kind, "calendar");
  if (portuguese.kind !== "calendar") return;
  assert.match(portuguese.events[0].title, /MVP/);

  const english = respondToMessage("Show my events", "en");
  assert.equal(english.kind, "calendar");
  if (english.kind !== "calendar") return;
  assert.match(english.events[0].title, /focus/);
});
