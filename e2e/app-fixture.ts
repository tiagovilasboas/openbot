import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { stubStream, type StreamStub } from "./stream-stub.ts";

/** One scripted answer of the stubbed model, shaped like the real routes. */
export interface StubbedReply {
  text?: string;
  /** Anything but 200 returns `{ error }` like the real route does. */
  status?: number;
  delayMs?: number;
  /** Token counts the stubbed provider reports; absent means none. */
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface ModelStub {
  /** Answers /api/chat calls in order; later calls get a default reply. */
  queue: (...replies: StubbedReply[]) => void;
  /** Bodies of the /api/chat calls received so far. */
  chatRequests: () => unknown[];
  /** The streaming route; unscripted, it answers 503 and the app falls back
   * to /api/chat, so every spec above keeps using `queue`. */
  stream: StreamStub;
}

const DEFAULT_REPLY = "Stub reply";

/** Stubs /api/chat, /api/chat/stream and /api/model/test; nothing leaves the box. */
export async function stubModel(context: BrowserContext): Promise<ModelStub> {
  const scripted: StubbedReply[] = [];
  const received: unknown[] = [];
  const stream = await stubStream(context);

  await context.route("**/api/chat", async (route) => {
    received.push(route.request().postDataJSON());
    const reply = scripted.shift() ?? {};
    if (reply.delayMs) await new Promise((r) => setTimeout(r, reply.delayMs));
    const status = reply.status ?? 200;
    if (status !== 200) {
      await route.fulfill({
        status,
        json: { error: "provider_error", provider: "stub", detail: "stub" },
      });
      return;
    }
    await route.fulfill({
      json: {
        provider: "stub",
        text: reply.text ?? DEFAULT_REPLY,
        ...(reply.usage ? { usage: reply.usage } : {}),
      },
    });
  });

  await context.route("**/api/model/test", (route) =>
    route.fulfill({ json: { ok: true, provider: "stub" } }),
  );

  return {
    queue: (...replies) => void scripted.push(...replies),
    chatRequests: () => received,
    stream,
  };
}

/** Writes and reads like a person: composer, sidebar, settings. */
export function appPage(page: Page) {
  return {
    composer: page.getByRole("textbox", { name: "mensagem para o OpenBot" }),
    async send(text: string) {
      await this.composer.fill(text);
      await this.composer.press("Enter");
    },
    /** The select button of each bot row, in sidebar order (name + role). */
    botRows: () => page.locator("nav li > button:first-child"),
    async openSettingsTab(tab: string) {
      await page.getByRole("button", { name: "Configurações" }).click();
      await page.getByRole("tab", { name: tab }).click();
    },
  };
}

interface StoredBots {
  bots: unknown[];
  activeBotId: string | null;
  mainBotId: string | null;
}

/**
 * Stands in for /api/bots with an in-memory store per browser context, so
 * specs stay isolated from each other and from the server's data dir. It
 * follows the real contract: GET is empty until the first PUT, and PUT
 * replaces the whole list and echoes the stored state.
 */
export async function stubBotsStore(context: BrowserContext): Promise<void> {
  let stored: StoredBots = { bots: [], activeBotId: null, mainBotId: null };
  await context.route("**/api/bots", async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      const body = request.postDataJSON() as Partial<StoredBots>;
      stored = {
        bots: Array.isArray(body.bots) ? body.bots : [],
        activeBotId: body.activeBotId ?? stored.activeBotId,
        mainBotId: body.mainBotId ?? stored.mainBotId,
      };
    }
    await route.fulfill({ json: stored });
  });
}

export const test = base.extend<{
  model: ModelStub;
  /** True for the few specs that talk to the real /api/bots route. */
  realBotsStore: boolean;
  botsStore: void;
}>({
  realBotsStore: [false, { option: true }],
  botsStore: [
    async ({ context, realBotsStore }, provide) => {
      if (!realBotsStore) await stubBotsStore(context);
      await provide();
    },
    { auto: true },
  ],
  // Named `provide`, not `use`: eslint-plugin-react-hooks reads `use(` as a hook.
  model: async ({ context }, provide) => {
    const model = await stubModel(context);
    await provide(model);
    await model.stream.close();
  },
});

export { expect };
