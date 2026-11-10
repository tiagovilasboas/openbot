import { appPage, expect, test } from "./app-fixture.ts";

test("usage per bot is summed from what the provider reported, kept on reload, and can be reset", async ({
  page,
  model,
}) => {
  model.queue(
    { text: "Answer one", usage: { inputTokens: 1200, outputTokens: 300 } },
    { text: "Answer two", usage: { inputTokens: 800, outputTokens: 200 } },
    // The provider reported nothing: counted apart, never guessed.
    { text: "Answer three" },
  );
  await page.goto("/");
  const app = appPage(page);

  for (const [question, answer] of [
    ["first", "Answer one"],
    ["second", "Answer two"],
    ["third", "Answer three"],
  ]) {
    await app.send(question);
    await expect(page.getByText(answer)).toBeVisible();
  }

  const panel = page.getByRole("tabpanel");
  const chiefRow = panel.getByRole("listitem").filter({
    has: page.getByText("Chief of Staff", { exact: true }),
  });

  async function openUsage() {
    await app.openSettingsTab("Uso");
    await expect(
      panel.getByRole("heading", { name: "Uso por bot" }),
    ).toBeVisible();
  }

  await openUsage();
  await expect(chiefRow).toContainText("2.000 entrada · 500 saída");
  await expect(chiefRow).toContainText("3 respostas");
  await expect(chiefRow).toContainText("1 resposta sem dados de uso");
  // Today counts inside the last 7 days.
  await expect(chiefRow.getByText("Últimos 7 dias")).toBeVisible();
  await expect(chiefRow).toContainText("2.000 entrada · 500 saída");
  // Other bots have not replied: nothing counted for them.
  await expect(
    panel.getByText("Nenhuma resposta contada ainda.").first(),
  ).toBeVisible();

  // The numbers live on the device: a reload keeps them.
  await page.reload();
  await openUsage();
  await expect(chiefRow).toContainText("2.000 entrada · 500 saída");

  // Reset asks first; cancelling keeps everything.
  await chiefRow
    .getByRole("button", { name: "Zerar uso de Chief of Staff" })
    .click();
  await expect(chiefRow.getByRole("alert")).toContainText(
    "Zerar o uso deste bot?",
  );
  await chiefRow.getByRole("button", { name: "Cancelar" }).click();
  await expect(chiefRow).toContainText("2.000 entrada · 500 saída");

  await chiefRow
    .getByRole("button", { name: "Zerar uso de Chief of Staff" })
    .click();
  await chiefRow.getByRole("button", { name: "Sim, zerar" }).click();
  await expect(chiefRow).toContainText("Nenhuma resposta contada ainda.");
  await expect(chiefRow).not.toContainText("entrada");
  await expect(
    panel.getByRole("button", { name: "Zerar tudo" }),
  ).toBeDisabled();
});

test("reset all clears every bot after one confirmation", async ({
  page,
  model,
}) => {
  model.queue({
    text: "Only answer",
    usage: { inputTokens: 10, outputTokens: 4 },
  });
  await page.goto("/");
  const app = appPage(page);
  await app.send("hello");
  await expect(page.getByText("Only answer")).toBeVisible();

  await app.openSettingsTab("Uso");
  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("10 entrada · 4 saída");

  await panel.getByRole("button", { name: "Zerar tudo" }).click();
  await expect(panel.getByRole("alert")).toContainText(
    "Zerar o uso de todos os bots?",
  );
  await panel.getByRole("button", { name: "Sim, zerar" }).click();
  await expect(panel).not.toContainText("entrada");
});
