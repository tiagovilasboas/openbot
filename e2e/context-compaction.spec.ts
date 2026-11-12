import { appPage, expect, test } from "./app-fixture.ts";

const BOT_ID = "chief-of-staff";
const WORDS = [
  "alpha",
  "bravo",
  "charlie",
  "delta",
  "echo",
  "foxtrot",
  "golf",
  "hotel",
  "india",
  "juliet",
];

/**
 * Five exchanges of about 20,000 characters each: over 75% of the 32k window
 * the app assumes for a model it does not know, so the next turn compacts.
 */
const longThread = WORDS.map((word, index) => ({
  id: index + 1,
  language: "pt",
  role: index % 2 === 0 ? "user" : "assistant",
  text: `${word}-old ${"lorem ".repeat(3_300)}`,
}));

test.describe("a thread that fills the window", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ key, thread }) => {
        if (!window.localStorage.getItem(key)) {
          window.localStorage.setItem(key, JSON.stringify(thread));
        }
      },
      { key: `openbot_msgs_${BOT_ID}`, thread: longThread },
    );
  });

  test("is folded into a summary before the next turn, and the archive opens", async ({
    page,
    model,
  }) => {
    // The first call is the summary, the second is the real answer.
    model.queue({ text: "SUMMARY-OF-OLD-TURNS" }, { text: "Real answer" });
    await page.goto("/");
    const app = appPage(page);

    await app.send("what is next?");
    const thread = page.getByRole("region", { name: "Conversa" });
    await expect(thread.getByText("Real answer")).toBeVisible();

    await expect(
      thread.getByText("Histórico anterior compactado (4 mensagens)"),
    ).toBeVisible();

    // The turn carried the summary and none of the archived turns.
    expect(model.chatRequests()).toHaveLength(2);
    const turn = JSON.stringify(model.chatRequests()[1]);
    expect(turn).toContain("SUMMARY-OF-OLD-TURNS");
    expect(turn).toContain("what is next?");
    for (const word of WORDS.slice(0, 4)) {
      expect(turn).not.toContain(`${word}-old`);
    }
    // The recent messages still travel.
    expect(turn).toContain("echo-old");

    // The archive is closed until asked for, then readable.
    const toggle = thread.getByRole("button", { name: "Mostrar mensagens" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(thread.getByText("alpha-old")).toBeHidden();
    await toggle.click();
    await expect(
      thread.getByRole("button", { name: "Ocultar mensagens" }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(thread.getByText("alpha-old")).toBeVisible();
    await expect(thread.getByText("delta-old")).toBeVisible();

    // The compacted thread is what is stored: it survives a reload.
    await page.reload();
    await expect(
      page
        .getByRole("region", { name: "Conversa" })
        .getByText("Histórico anterior compactado (4 mensagens)"),
    ).toBeVisible();
  });

  test("a failed summary does not block the turn or touch the thread", async ({
    page,
    model,
  }) => {
    model.queue({ status: 502 }, { text: "Answer without compaction" });
    await page.goto("/");
    const app = appPage(page);

    await app.send("what is next?");
    const thread = page.getByRole("region", { name: "Conversa" });
    await expect(thread.getByText("Answer without compaction")).toBeVisible();
    await expect(thread.getByText(/Histórico anterior compactado/)).toHaveCount(
      0,
    );
    expect(model.chatRequests()).toHaveLength(2);
  });
});
