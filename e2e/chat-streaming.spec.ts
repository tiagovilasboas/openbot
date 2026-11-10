import { appPage, expect, test } from "./app-fixture.ts";

test("the reply appears while it is generated and is announced once", async ({
  page,
  model,
}) => {
  model.stream.queue([
    { delta: "Hello " },
    { gate: "more" },
    { delta: "streaming world" },
    { done: true },
  ]);
  await page.goto("/");
  const app = appPage(page);
  await app.send("Say hi");

  const thread = page.getByRole("region", { name: "Conversa" });
  // The first words are on screen while the rest is still held back.
  await expect(thread.getByText("Hello")).toBeVisible();
  await expect(thread.getByText("streaming world")).toHaveCount(0);
  // The thread is busy, so a screen reader is not read every delta.
  await expect(thread).toHaveAttribute("aria-busy", "true");
  await expect(thread.locator('[aria-live="off"]')).toContainText("Hello");

  model.stream.release("more");
  await expect(thread.getByText("Hello streaming world")).toBeVisible();
  await expect(thread).toHaveAttribute("aria-busy", "false");
  await expect(thread.locator('[aria-live="off"]')).toHaveCount(0);
  // The stream route answered: the plain route was never asked.
  expect(model.chatRequests()).toHaveLength(0);
  expect(model.stream.requests()).toHaveLength(1);
});

test("an error midway keeps the partial text and retry resends the message", async ({
  page,
  model,
}) => {
  model.stream.queue(
    [{ delta: "A half answer" }, { error: "server" }],
    [{ delta: "The full answer" }, { done: true }],
  );
  await page.goto("/");
  const app = appPage(page);
  await app.send("Tell me everything");

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("A half answer")).toBeVisible();
  await expect(thread.getByText(/Resposta interrompida/)).toBeVisible();
  // No raw code or provider text reaches the chat.
  await expect(thread.getByText("server")).toHaveCount(0);

  await thread.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(thread.getByText("The full answer")).toBeVisible();
  // The partial reply was replaced, not kept beside the new one.
  await expect(thread.getByText("A half answer")).toHaveCount(0);
  await expect(thread.getByText(/Resposta interrompida/)).toHaveCount(0);

  const bodies = model.stream.requests() as Array<{
    messages: Array<{ role: string; text: string }>;
  }>;
  expect(bodies).toHaveLength(2);
  expect(bodies[1]?.messages.at(-1)).toEqual({
    role: "user",
    text: "Tell me everything",
  });
});

test("a partial reply survives a reload", async ({ page, model }) => {
  model.stream.queue([{ delta: "Kept text" }, { error: "server" }]);
  await page.goto("/");
  await appPage(page).send("Persist me");
  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText(/Resposta interrompida/)).toBeVisible();

  await page.reload();
  await expect(thread.getByText("Kept text")).toBeVisible();
  await expect(thread.getByText(/Resposta interrompida/)).toBeVisible();
});

test("cancel stops the stream and keeps what arrived", async ({
  page,
  model,
}) => {
  model.stream.queue([
    { delta: "Only this much" },
    { gate: "never" },
    { delta: " and never this" },
    { done: true },
  ]);
  await page.goto("/");
  await appPage(page).send("Go on and on");

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Only this much")).toBeVisible();
  await thread.getByRole("button", { name: "Cancelar resposta" }).click();

  await expect(thread.getByText("Resposta cancelada.")).toBeVisible();
  await expect(thread.getByText("Only this much")).toBeVisible();
  await expect(thread.getByText("never this")).toHaveCount(0);
  // The server side saw the client leave.
  await expect.poll(() => model.stream.aborted()).toBe(1);
  await expect(appPage(page).composer).toBeEnabled();
});

test("a delegated turn streams each step in its turn", async ({
  page,
  model,
}) => {
  model.stream.queue(
    [
      { delta: "Checking.\n@delegate Eng" },
      { delta: "ineering: look at CI" },
      { done: true },
    ],
    [
      { delta: "The pipeline " },
      { gate: "specialist" },
      { delta: "is green." },
      { done: true },
    ],
    [{ delta: "Final answer: CI is healthy." }, { done: true }],
  );
  await page.goto("/");
  await appPage(page).send("How is our CI?");

  const thread = page.getByRole("region", { name: "Conversa" });
  // The kickoff stays while the specialist is still talking.
  await expect(thread.getByText("Delegando para Engineering.")).toBeVisible();
  await expect(thread.getByText("The pipeline")).toBeVisible();
  await expect(thread.getByText("is green.")).toHaveCount(0);

  model.stream.release("specialist");
  await expect(thread.getByText("Final answer: CI is healthy.")).toBeVisible();
  const specialist = thread
    .locator("article")
    .filter({ hasText: "The pipeline is green." });
  await expect(specialist).toContainText("via @Engineering");
  await expect(thread.getByText("@delegate")).toHaveCount(0);
  expect(model.stream.requests()).toHaveLength(3);
  expect(model.chatRequests()).toHaveLength(0);
});

test("when the stream route is down the plain route answers", async ({
  page,
  model,
}) => {
  // No stream script: the stub answers 503 like a server without streaming.
  model.queue({ text: "Plain answer" });
  await page.goto("/");
  await appPage(page).send("Hello?");

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Plain answer")).toBeVisible();
  expect(model.stream.requests()).toHaveLength(1);
  expect(model.chatRequests()).toHaveLength(1);
});
