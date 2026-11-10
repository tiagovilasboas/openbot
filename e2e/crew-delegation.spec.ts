import { appPage, expect, test } from "./app-fixture.ts";

test("the Chief delegates to a specialist and synthesizes the answer", async ({
  page,
  model,
}) => {
  model.queue(
    { text: "@delegate Engineering: check the CI pipeline" },
    { text: "The pipeline is green." },
    { text: "Final answer: CI is healthy." },
  );
  await page.goto("/");
  const app = appPage(page);

  await app.send("How is our CI?");

  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Delegando para Engineering.")).toBeVisible();
  const specialist = thread
    .locator("article")
    .filter({ hasText: "The pipeline is green." });
  await expect(specialist).toContainText("via @Engineering");
  await expect(thread.getByText("Final answer: CI is healthy.")).toBeVisible();

  // Chief decision, specialist answer, Chief synthesis: three model calls.
  expect(model.chatRequests()).toHaveLength(3);
  // The raw delegation line never reaches the user.
  await expect(thread.getByText("@delegate")).toHaveCount(0);
});
