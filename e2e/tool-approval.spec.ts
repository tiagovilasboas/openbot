import type { Page } from "@playwright/test";
import { appPage, expect, test } from "./app-fixture.ts";
import { toolEvents as ev } from "./tools-stub.ts";

type ToolsBody = {
  botId?: string;
  toolsEnabled?: boolean;
  messages?: unknown[];
  resume?: { turnId: string; decisions: unknown[] };
};

const TURN = "0f8e6c2a-1b2c-4d5e-8f90-123456789abc";
const DIGEST = "a".repeat(64);
const NOTE_CALL = {
  callId: "c1",
  name: "memory_add_note",
  preview: "gosta de chá",
  argsDigest: DIGEST,
  allowAlways: true,
};
/** A first turn that writes a line, asks to save a note and pauses. */
const PAUSE = {
  events: [
    ev.delta("Vou salvar isso."),
    ev.call("c1", "memory_add_note", "gosta de chá"),
    ev.approval(TURN, [NOTE_CALL], Date.now() + 15 * 60_000),
  ],
};

/** Turns tools on for Engineering, then opens its thread. */
async function optInEngineering(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Editar Engineering" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  const toggle = dialog.getByRole("switch", { name: "Ferramentas" });
  await toggle.click();
  await expect(toggle).toBeChecked();
  await dialog.getByRole("button", { name: "Salvar bot" }).click();
  await appPage(page).botRows().filter({ hasText: "Engineering" }).click();
}

function approvalCard(page: Page) {
  return page.getByRole("region", { name: "O bot quer usar uma ferramenta" });
}

test("an approved tool call resumes the same turn and shows its step", async ({
  page,
  model,
}) => {
  model.tools.queue(PAUSE, {
    events: [
      ev.result("c1", true, "Saved note 1: gosta de chá"),
      { type: "memory_changed" },
      ev.delta("Pronto, salvei."),
      ev.done,
    ],
  });
  await optInEngineering(page);
  await appPage(page).send("lembra que eu gosto de chá");

  const card = approvalCard(page);
  await expect(card).toBeVisible();
  await expect(
    card.getByRole("heading", { name: "O bot quer usar uma ferramenta" }),
  ).toBeFocused();
  await expect(card).toContainText("Salvar uma nota na memória");
  await expect(card).toContainText("gosta de chá");
  await expect(card).toContainText("Expira às");
  const first = model.tools.requests()[0] as ToolsBody;
  expect(first.botId).toBe("engineering");
  expect(first.toolsEnabled).toBe(true);

  await card.getByRole("button", { name: "Permitir uma vez" }).click();

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Pronto, salvei.")).toBeVisible();
  await expect(card).toHaveCount(0);
  const step = thread
    .getByRole("list", { name: "Ferramentas usadas" })
    .getByRole("listitem");
  await expect(step).toContainText("Salvar uma nota na memória");
  await expect(step).toContainText("feito");
  const resume = model.tools.requests()[1] as ToolsBody;
  expect(resume.messages).toEqual(first.messages);
  expect(resume.resume).toEqual({
    turnId: TURN,
    decisions: [{ callId: "c1", decision: "once", argsDigest: DIGEST }],
  });
  // Nothing went to the plain routes.
  expect(model.chatRequests()).toHaveLength(0);
  expect(model.stream.requests()).toHaveLength(0);
});

test("a denied tool call resumes with the denial and shows it", async ({
  page,
  model,
}) => {
  model.tools.queue(PAUSE, {
    events: [
      ev.result("c1", false, "denied_by_user"),
      ev.delta("Tudo bem, não salvei."),
      ev.done,
    ],
  });
  await optInEngineering(page);
  await appPage(page).send("lembra que eu gosto de chá");

  await approvalCard(page).getByRole("button", { name: "Negar" }).click();

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Tudo bem, não salvei.")).toBeVisible();
  await expect(
    thread.getByRole("list", { name: "Ferramentas usadas" }),
  ).toContainText("negado");
  const resume = model.tools.requests()[1] as ToolsBody;
  expect(resume.resume?.decisions).toEqual([
    { callId: "c1", decision: "deny", argsDigest: DIGEST },
  ]);
});

test("a pause the server dropped stays readable, its step expired", async ({
  page,
  model,
}) => {
  model.tools.queue(PAUSE, { status: 410 });
  await optInEngineering(page);
  await appPage(page).send("lembra que eu gosto de chá");

  await approvalCard(page)
    .getByRole("button", { name: "Permitir uma vez" })
    .click();

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(approvalCard(page)).toHaveCount(0);
  await expect(thread.getByText("Vou salvar isso.")).toBeVisible();
  await expect(
    thread.getByRole("list", { name: "Ferramentas usadas" }),
  ).toContainText("expirou");
  // A refused resume is never sent anywhere else.
  expect(model.tools.requests()).toHaveLength(2);
  expect(model.chatRequests()).toHaveLength(0);
  expect(model.stream.requests()).toHaveLength(0);
});
