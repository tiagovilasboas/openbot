import type { Page } from "@playwright/test";
import { appPage, expect, test } from "./app-fixture.ts";
import { toolEvents as ev } from "./tools-stub.ts";

type ToolsBody = { resume?: { turnId: string; decisions: unknown[] } };

const TURN = "1f8e6c2a-1b2c-4d5e-8f90-123456789abc";
const DIGEST = "b".repeat(64);
const ASK = {
  question: "Chá ou café?",
  options: ["Chá", "Café"],
  allowFreeText: true,
};
/** A first turn that asks the user a question and pauses. */
const PAUSE = {
  events: [
    ev.delta("Uma pergunta antes."),
    ev.call("q1", "ask_user", "ask_user"),
    ev.approval(
      TURN,
      [
        {
          callId: "q1",
          name: "ask_user",
          preview: "ask_user",
          argsDigest: DIGEST,
          allowAlways: true,
          ask: ASK,
        },
      ],
      Date.now() + 15 * 60_000,
    ),
  ],
};

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

const askCard = (page: Page) =>
  page.getByRole("region", { name: "O bot tem uma pergunta" });

test("picking an option resumes the turn and keeps the answer", async ({
  page,
  model,
}) => {
  model.tools.queue(PAUSE, {
    events: [ev.result("q1", true, "Café"), ev.delta("Café, então."), ev.done],
  });
  await optInEngineering(page);
  await appPage(page).send("me ajuda a escolher");

  const card = askCard(page);
  await expect(card).toBeVisible();
  await expect(
    card.getByRole("heading", { name: "O bot tem uma pergunta" }),
  ).toBeFocused();
  await expect(card).toContainText("Chá ou café?");
  await card.getByRole("button", { name: "Café" }).click();

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Café, então.")).toBeVisible();
  await expect(card).toHaveCount(0);
  await expect(
    thread.getByRole("list", { name: "Ferramentas usadas" }),
  ).toContainText("Você respondeu: Café");
  const resume = model.tools.requests()[1] as ToolsBody;
  expect(resume.resume).toEqual({
    turnId: TURN,
    decisions: [
      {
        callId: "q1",
        decision: "once",
        argsDigest: DIGEST,
        answer: { kind: "option", index: 1 },
      },
    ],
  });
  expect(model.chatRequests()).toHaveLength(0);
  expect(model.stream.requests()).toHaveLength(0);
});

test("a free-text answer is sent from the keyboard", async ({
  page,
  model,
}) => {
  model.tools.queue(PAUSE, {
    events: [ev.result("q1", true, "Água"), ev.delta("Água, ok."), ev.done],
  });
  await optInEngineering(page);
  await appPage(page).send("me ajuda a escolher");

  const field = askCard(page).getByLabel("Ou escreva sua resposta");
  await field.fill("Água");
  await field.press("Enter");

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Água, ok.")).toBeVisible();
  const resume = model.tools.requests()[1] as ToolsBody;
  expect(resume.resume?.decisions).toEqual([
    {
      callId: "q1",
      decision: "once",
      argsDigest: DIGEST,
      answer: { kind: "text", text: "Água" },
    },
  ]);
});
