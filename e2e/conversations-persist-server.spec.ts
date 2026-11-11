import { appPage, expect, test } from "./app-fixture.ts";

// Talks to the real /api/conversations route; the e2e server keeps its
// data in a temporary dir, never in the user's home.
test.use({ realConversationsStore: true });

const isThreadSave = (response: {
  url(): string;
  request(): { method(): string; postDataJSON(): unknown };
}) =>
  new URL(response.url()).pathname === "/api/conversations" &&
  response.request().method() === "PUT" &&
  JSON.stringify(response.request().postDataJSON()).includes("Reply from");

test("a sent message is saved on the server and survives clearing the browser storage", async ({
  page,
  model,
}) => {
  model.queue({ text: "Reply from the stub" });
  await page.goto("/");
  const app = appPage(page);

  const saved = page.waitForResponse(isThreadSave);
  await app.send("Remember this one");
  const response = await saved;
  expect(response.status()).toBe(200);
  const body = response.request().postDataJSON() as {
    messages: { text: string }[];
  };
  expect(body.messages.map((m) => m.text)).toEqual([
    "Remember this one",
    "Reply from the stub",
  ]);

  // Only the server can bring the thread back after this.
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Remember this one")).toBeVisible();
  await expect(thread.getByText("Reply from the stub")).toBeVisible();
  // Loading the thread must not ask the model again.
  expect(model.chatRequests()).toHaveLength(1);
});
