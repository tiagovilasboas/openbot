import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { stubMemoryStore } from "./memory-store-stub.ts";
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

type SavedKey = { provider: string; origin: string; updatedAt: number };

/**
 * Stands in for /api/keys per browser context. The real vault is shared by
 * every parallel spec, so a reset in one spec would forget another's key.
 * Like the real route, it never echoes a key value.
 */
export async function stubKeysStore(context: BrowserContext): Promise<void> {
  const saved = new Map<string, SavedKey>();
  await context.route("**/api/keys**", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "PUT") {
      const body = request.postDataJSON() as {
        provider: string;
        origin: string;
      };
      const entry = {
        provider: body.provider,
        origin: new URL(body.origin).origin,
        updatedAt: Date.now(),
      };
      saved.set(entry.provider, entry);
      await route.fulfill({ json: entry });
      return;
    }
    if (method === "DELETE") {
      saved.delete(new URL(request.url()).searchParams.get("provider") ?? "");
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fulfill({ json: { keys: [...saved.values()] } });
  });
}

/**
 * Stands in for /api/conversations per browser context: one thread per bot,
 * kept in memory. It follows the contract: GET reads, PUT replaces the whole
 * thread (an empty list deletes it), DELETE answers 204.
 */
export async function stubConversationsStore(
  context: BrowserContext,
): Promise<void> {
  const threads = new Map<string, { messages: unknown[]; updatedAt: number }>();
  await context.route("**/api/conversations**", async (route) => {
    const request = route.request();
    const method = request.method();
    const botId = new URL(request.url()).searchParams.get("botId");
    if (!botId) {
      const list = [...threads].map(([id, t]) => ({
        botId: id,
        updatedAt: t.updatedAt,
        count: t.messages.length,
      }));
      await route.fulfill({ json: { threads: list } });
      return;
    }
    if (method === "PUT") {
      const body = request.postDataJSON() as { messages?: unknown[] };
      const messages = Array.isArray(body.messages) ? body.messages : [];
      if (messages.length === 0) threads.delete(botId);
      else threads.set(botId, { messages, updatedAt: Date.now() });
      await route.fulfill({
        json: {
          botId,
          updatedAt: messages.length === 0 ? null : Date.now(),
          count: messages.length,
        },
      });
      return;
    }
    if (method === "DELETE") {
      threads.delete(botId);
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    const thread = threads.get(botId);
    await route.fulfill({
      json: {
        botId,
        messages: thread?.messages ?? [],
        updatedAt: thread?.updatedAt ?? null,
      },
    });
  });
}

/**
 * Stands in for /api/usage per browser context: one global log kept in
 * memory. GET reads, PUT replaces the whole log, DELETE answers 204.
 */
export async function stubUsageStore(context: BrowserContext): Promise<void> {
  let records: unknown[] = [];
  let updatedAt: number | null = null;
  await context.route("**/api/usage**", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "PUT") {
      const body = request.postDataJSON() as { records?: unknown[] };
      records = Array.isArray(body.records) ? body.records : [];
      updatedAt = records.length === 0 ? null : Date.now();
      await route.fulfill({ json: { updatedAt, count: records.length } });
      return;
    }
    if (method === "DELETE") {
      records = [];
      updatedAt = null;
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fulfill({ json: { records, updatedAt } });
  });
}

export const test = base.extend<{
  model: ModelStub;
  /** True for the few specs that talk to the real /api/bots route. */
  realBotsStore: boolean;
  botsStore: void;
  /** True for the few specs that talk to the real /api/keys route. */
  realKeysStore: boolean;
  keysStore: void;
  /** True for the few specs that talk to the real /api/conversations route. */
  realConversationsStore: boolean;
  conversationsStore: void;
  /** True for the few specs that talk to the real /api/usage route. */
  realUsageStore: boolean;
  usageStore: void;
  /** True for the few specs that talk to the real /api/memory route. */
  realMemoryStore: boolean;
  memoryStore: void;
}>({
  realMemoryStore: [false, { option: true }],
  memoryStore: [
    async ({ context, realMemoryStore }, provide) => {
      if (!realMemoryStore) await stubMemoryStore(context);
      await provide();
    },
    { auto: true },
  ],
  realUsageStore: [false, { option: true }],
  usageStore: [
    async ({ context, realUsageStore }, provide) => {
      if (!realUsageStore) await stubUsageStore(context);
      await provide();
    },
    { auto: true },
  ],
  realConversationsStore: [false, { option: true }],
  conversationsStore: [
    async ({ context, realConversationsStore }, provide) => {
      if (!realConversationsStore) await stubConversationsStore(context);
      await provide();
    },
    { auto: true },
  ],
  realBotsStore: [false, { option: true }],
  botsStore: [
    async ({ context, realBotsStore }, provide) => {
      if (!realBotsStore) await stubBotsStore(context);
      await provide();
    },
    { auto: true },
  ],
  realKeysStore: [false, { option: true }],
  keysStore: [
    async ({ context, realKeysStore }, provide) => {
      if (!realKeysStore) await stubKeysStore(context);
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

export { expect, stubMemoryStore };
