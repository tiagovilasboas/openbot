import type { Page } from "@playwright/test";
import { appPage, expect, test } from "./app-fixture.ts";

const notes = {
  name: "notes.md",
  mimeType: "text/markdown",
  buffer: Buffer.from("# Plan\nship on friday"),
};

function attach(page: Page, ...files: (typeof notes)[]) {
  return page.locator('input[type="file"]').setInputFiles(files);
}

const chips = (page: Page) =>
  page.getByRole("list", { name: "Arquivos anexados" });

/** The composer's own note, not the sidebar's screen-reader status. */
const refusal = (page: Page) => page.locator('[role="status"].text-danger');

type ChatBody = { attachments?: Array<{ name: string; text: string }> };

test("an attached file is read on the device and sent raw with the question", async ({
  page,
  model,
}) => {
  model.queue({ text: "It is a short plan." });
  await page.goto("/");
  const app = appPage(page);

  await attach(page, notes);
  await expect(chips(page).getByText("notes.md")).toBeVisible();
  await expect(chips(page)).toContainText("21 B");

  await app.send("what does the file say?");

  const turns = page
    .getByRole("region", { name: "Conversa" })
    .locator("article");
  await expect(turns.nth(1)).toContainText("It is a short plan.");
  // The sent message shows which file went along, not what was in it.
  const mine = turns.nth(0);
  await expect(mine).toContainText("what does the file say?");
  await expect(
    mine.getByRole("list", { name: "Arquivos enviados com esta mensagem" }),
  ).toContainText("notes.md");
  await expect(mine).not.toContainText("# Plan");

  // The request carries the raw name and text; the server builds the block.
  const body = model.chatRequests()[0] as ChatBody;
  expect(body.attachments).toEqual([
    { name: "notes.md", text: "# Plan\nship on friday" },
  ]);
  await expect(chips(page)).toHaveCount(0);

  // The stored thread keeps names and sizes, never the file text.
  const stored = await page.evaluate(() =>
    Object.entries(localStorage)
      .filter(([key]) => key.startsWith("openbot_msgs_"))
      .map(([, value]) => value)
      .join("\n"),
  );
  expect(stored).toContain("notes.md");
  expect(stored).not.toContain("ship on friday");
});

test("a removed file does not travel", async ({ page, model }) => {
  await page.goto("/");
  const app = appPage(page);

  await attach(page, notes);
  await page.getByRole("button", { name: "Remover notes.md" }).click();
  await expect(chips(page)).toHaveCount(0);

  await app.send("never mind");
  await expect(
    page.getByRole("region", { name: "Conversa" }).locator("article"),
  ).toHaveCount(2);
  expect("attachments" in (model.chatRequests()[0] as object)).toBe(false);
});

test("a binary file is refused with a plain message", async ({ page }) => {
  await page.goto("/");

  await attach(page, {
    name: "fake.txt",
    mimeType: "text/plain",
    buffer: Buffer.from([0x89, 0x50, 0x00, 0x47, 0x0d]),
  });
  await expect(refusal(page)).toContainText(
    "fake.txt: só leio arquivos de texto",
  );
  await expect(chips(page)).toHaveCount(0);

  await attach(page, {
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from([1, 2, 3]),
  });
  await expect(refusal(page)).toContainText("photo.png");
});

test("a long file is cut and says so", async ({ page, model }) => {
  await page.goto("/");
  const app = appPage(page);

  await attach(page, {
    name: "long.log",
    mimeType: "text/plain",
    buffer: Buffer.from("line of log\n".repeat(2000)),
  });
  await expect(chips(page)).toContainText("só o começo vai ao modelo");

  await app.send("summarize");
  await expect(
    page.getByRole("region", { name: "Conversa" }).locator("article"),
  ).toHaveCount(2);
  const body = model.chatRequests()[0] as ChatBody;
  expect(body.attachments?.[0].text.length).toBe(12000);
});

test("a queued message keeps its own file", async ({ page, model }) => {
  model.queue({ text: "Answer to one", delayMs: 700 }, { text: "Answer two" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first, no file");
  await attach(page, notes);
  await app.send("second, with a file");

  await expect(
    page.getByRole("region", { name: "Conversa" }).locator("article"),
  ).toHaveCount(4);
  const [first, second] = model.chatRequests() as ChatBody[];
  expect(first.attachments).toBeUndefined();
  expect(second.attachments?.[0].name).toBe("notes.md");
});

test("a file dropped on the composer is attached", async ({ page }) => {
  await page.goto("/");
  const app = appPage(page);

  const data = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(["dropped text"], "dropped.txt", { type: "text/plain" }),
    );
    return transfer;
  });
  await app.composer.dispatchEvent("dragover", { dataTransfer: data });
  await app.composer.dispatchEvent("drop", { dataTransfer: data });

  await expect(chips(page).getByText("dropped.txt")).toBeVisible();
});
