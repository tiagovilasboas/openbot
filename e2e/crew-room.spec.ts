import { appPage, expect, test } from "./app-fixture.ts";

test("the team room shows who was asked what, and focus returns on close", async ({
  page,
  model,
}) => {
  model.queue(
    { text: "@delegate Engineering: check the CI pipeline" },
    { text: "The pipeline is green." },
    { text: "Final answer: CI is healthy." },
  );
  await page.goto("/");
  await appPage(page).send("How is our CI?");

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Final answer: CI is healthy.")).toBeVisible();

  const control = thread.getByRole("button", { name: "Sala da equipe" });
  await expect(control).toHaveCount(1);
  await control.focus();
  await page.keyboard.press("Enter");

  const room = page.getByRole("dialog", { name: "Sala da equipe" });
  await expect(room).toBeVisible();
  await expect(
    room.getByRole("heading", { name: /Passos, em ordem/ }),
  ).toBeVisible();
  const steps = room.getByRole("list").getByRole("listitem");
  await expect(steps).toHaveCount(1);
  await expect(
    steps.getByRole("heading", { name: /Engineering/ }),
  ).toBeVisible();
  await expect(steps).toContainText("Tarefa recebida: check the CI pipeline");
  await expect(steps).toContainText("Respondeu");
  await expect(room.getByText("Final answer: CI is healthy.")).toBeVisible();

  // The reply is collapsed until asked for.
  const reveal = steps.getByRole("button", { name: "Ver resposta" });
  await expect(reveal).toHaveAttribute("aria-expanded", "false");
  await expect(room.getByText("The pipeline is green.")).toBeHidden();
  await reveal.click();
  await expect(room.getByText("The pipeline is green.")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(room).toBeHidden();
  await expect(control).toBeFocused();
});

test("a plain reply has no team room", async ({ page, model }) => {
  model.queue({ text: "Just an answer." });
  await page.goto("/");
  await appPage(page).send("Hello");
  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Just an answer.")).toBeVisible();
  await expect(
    thread.getByRole("button", { name: "Sala da equipe" }),
  ).toHaveCount(0);
});

test("the team room fits a phone and shows a failed step", async ({
  page,
  model,
}) => {
  await page.setViewportSize({ width: 375, height: 760 });
  model.queue(
    { text: "@delegate Engineering: check CI\n@delegate Security: scan" },
    { text: "The pipeline is green." },
    { status: 502 },
    { text: "Final answer." },
  );
  await page.goto("/");
  await appPage(page).send("How is our CI?");
  const thread = page.getByRole("region", { name: "Conversa" });
  await thread.getByRole("button", { name: "Sala da equipe" }).click();

  const room = page.getByRole("dialog", { name: "Sala da equipe" });
  const steps = room.getByRole("list").getByRole("listitem");
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(1)).toContainText("Não respondeu");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
