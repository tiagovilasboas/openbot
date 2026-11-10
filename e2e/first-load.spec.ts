import { appPage, expect, test } from "./app-fixture.ts";

test("first load shows nine bots, the Chief of Staff on top, and the empty state", async ({
  page,
  model,
}) => {
  await page.goto("/");
  const app = appPage(page);

  await expect(app.botRows()).toHaveCount(9);
  await expect(app.botRows().first()).toContainText("Chief of Staff");
  await expect(app.botRows().first()).toContainText("Manager & Orquestrador");

  await expect(
    page.getByRole("heading", {
      name: "Como Chief of Staff pode ajudar você hoje?",
      level: 2,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Sugestões para começar" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Conversa" })).toHaveCount(0);
  expect(model.chatRequests()).toHaveLength(0);
});
