import { expect, test } from "./app-fixture.ts";

test("the PT/EN switch survives a reload", async ({ page }) => {
  await page.goto("/");
  const switcher = page.getByRole("group", { name: "Idioma" });
  await expect(switcher.getByRole("button", { name: "PT" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await switcher.getByRole("button", { name: "EN" }).click();
  await expect(
    page.getByRole("heading", {
      name: "How can Chief of Staff help you today?",
    }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "How can Chief of Staff help you today?",
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "Language" })
      .getByRole("button", { name: "EN" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page
    .getByRole("group", { name: "Language" })
    .getByRole("button", { name: "PT" })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Como Chief of Staff pode ajudar você hoje?",
    }),
  ).toBeVisible();
});
