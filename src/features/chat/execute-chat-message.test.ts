import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { chatCopy } from "./chat-copy.ts";
import { crewCopy } from "../crew/crew-copy.ts";

const { executeChatMessage } = await import("./execute-chat-message.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const bots = [...CREW_PRESETS] as BotProfile[];
const chief = bots.find((b) => b.id === "chief-of-staff") as BotProfile;
const engineering = bots.find((b) => b.id === "engineering") as BotProfile;
const modelConfig: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://router.test/v1",
  model: "vendor/m",
};

type ChatCall = {
  systemPrompt?: string;
  messages: Array<{ role: string; text: string }>;
};
type Script = {
  /** Replies for /api/chat, consumed in order: text, or a failing status. */
  chat?: Array<string | { status: number; body: unknown }>;
  /** Response for /api/github/items. */
  items?: () => Response;
};

function stub(script: Script) {
  const chatCalls: ChatCall[] = [];
  const githubCalls: Array<{ owner: string; repo: string; token?: string }> =
    [];
  const queue = [...(script.chat ?? [])];
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (String(url) === "/api/chat") {
      chatCalls.push(body);
      const next = queue.shift();
      if (next === undefined) throw new Error("unexpected /api/chat call");
      return typeof next === "string"
        ? Response.json({ provider: "router", text: next })
        : Response.json(next.body, { status: next.status });
    }
    if (String(url) === "/api/github/items") {
      githubCalls.push(body);
      if (!script.items) throw new Error("unexpected github call");
      return script.items();
    }
    throw new Error(`unexpected url ${String(url)}`);
  }) as typeof fetch;
  return { chatCalls, githubCalls };
}

const item = (n: number, isPullRequest: boolean) => ({
  id: n,
  number: n,
  title: `item ${n}`,
  author: "ana",
  url: `https://github.com/acme/app/${n}`,
  labels: [],
  isPullRequest,
  commentsCount: 0,
  createdAt: "2026-01-01T00:00:00Z",
});

const repo = { owner: "acme", repo: "app" };
const okItems =
  (items = [item(1, false), item(2, true), item(3, true)]) =>
  () =>
    Response.json({ ok: true, repo, items, totalCount: items.length });

function run(
  text: string,
  overrides: Partial<Parameters<typeof executeChatMessage>[0]> = {},
) {
  return executeChatMessage({
    text,
    language: "en",
    history: [{ role: "user", text }],
    activeBot: chief,
    bots,
    gitHubToken: null,
    modelConfig,
    ...overrides,
  });
}

test("a summary request wins over GitHub detection and never calls the model without a config", async () => {
  const calls = stub({ items: okItems() });
  const out = await run("summarize acme/app issues", { modelConfig: null });
  assert.match(out.text, /Summary for acme\/app/);
  assert.equal(out.github?.items.length, 3);
  assert.equal(calls.githubCalls.length, 1);
  assert.equal(calls.chatCalls.length, 0);
});

test("a summary with a model config asks the model with the fetched items", async () => {
  const calls = stub({ items: okItems(), chat: ["model summary"] });
  const out = await run("resumo de acme/app", { language: "pt" });
  assert.equal(out.text, "model summary");
  assert.equal(calls.chatCalls.length, 1);
  assert.equal(calls.chatCalls[0]?.messages.length, 1);
});

test("a summary falls back to the deterministic text when the model fails", async () => {
  stub({
    items: okItems(),
    chat: [{ status: 502, body: { error: "provider_rejected" } }],
  });
  const out = await run("summary of acme/app");
  assert.match(out.text, /Summary for acme\/app/);
});

test("a summary reports a GitHub failure inside the text and has no github card", async () => {
  stub({
    items: () =>
      Response.json(
        { ok: false, repo, error: "repo_not_found" },
        { status: 404 },
      ),
  });
  const out = await run("summary of acme/app", { modelConfig: null });
  assert.match(out.text, /not found or inaccessible/);
  assert.equal(out.github, undefined);
});

test("the GitHub token is forwarded to the items route", async () => {
  const calls = stub({ items: okItems() });
  await run("issues of acme/app", { gitHubToken: "ghp_x" });
  assert.deepEqual(calls.githubCalls[0], { ...repo, token: "ghp_x" });
});

test("a GitHub request lists only issues, only PRs, or everything, in English", async () => {
  stub({ items: okItems() });
  const issues = await run("issues of acme/app");
  assert.equal(issues.text, "Found 1 issues in acme/app:");
  assert.deepEqual(
    issues.github?.items.map((i) => i.number),
    [1],
  );

  const prs = await run("prs of acme/app");
  assert.equal(prs.text, "Found 2 pull requests in acme/app:");
  assert.deepEqual(
    prs.github?.items.map((i) => i.number),
    [2, 3],
  );

  const all = await run("repo acme/app");
  assert.equal(all.text, "Found 3 open items in acme/app:");
  assert.equal(all.github?.items.length, 3);
});

test("a GitHub request answers in Portuguese when the language is pt", async () => {
  stub({ items: okItems() });
  const out = await run("issues de acme/app", { language: "pt" });
  assert.equal(out.text, "Encontrei 1 issues em acme/app:");
});

test("a GitHub request never reaches the model", async () => {
  const calls = stub({ items: okItems() });
  await run("issues of acme/app");
  assert.equal(calls.chatCalls.length, 0);
});

test("GitHub errors become the matching localized message", async () => {
  const cases: Array<[string, number, string]> = [
    ["repo_not_found", 404, "githubRepoNotFound"],
    ["rate_limited", 429, "githubRateLimited"],
    ["unauthorized", 401, "githubUnauthorized"],
    ["network_error", 502, "githubNetworkError"],
  ];
  for (const language of ["en", "pt"] as const) {
    for (const [error, status, key] of cases) {
      stub({
        items: () => Response.json({ ok: false, repo, error }, { status }),
      });
      const out = await run("issues of acme/app", { language });
      assert.equal(
        out.text,
        chatCopy[language][key as keyof (typeof chatCopy)["en"]],
        `${language} ${error}`,
      );
      assert.equal(out.github, undefined);
    }
  }
});

test("a GitHub request keeps the @mentioned bot as delegatedBot", async () => {
  stub({ items: okItems() });
  const out = await run("@Engineering issues of acme/app");
  assert.equal(out.delegatedBot?.id, "engineering");
});

test("an @mention hands the turn to that bot's own prompt", async () => {
  const calls = stub({ chat: ["engineering here"] });
  const out = await run("@Engineering review this");
  assert.equal(out.text, "engineering here");
  assert.equal(out.delegatedBot?.id, "engineering");
  assert.equal(out.modelCall, "ok");
  assert.match(calls.chatCalls[0]?.systemPrompt ?? "", /^Você é o Engineering/);
  assert.doesNotMatch(calls.chatCalls[0]?.systemPrompt ?? "", /Sua equipe/);
});

test("mentioning the active bot or an unknown name does not hand off", async () => {
  stub({ chat: ["a", "b"] });
  const self = await run("@Chief-of-Staff hi");
  assert.equal(self.delegatedBot, undefined);
  const unknown = await run("@nobody hi");
  assert.equal(unknown.delegatedBot, undefined);
});

test("a plain reply from a non-main bot comes back unchanged with modelCall ok", async () => {
  const calls = stub({ chat: ["just text\n@delegate Security: x"] });
  const out = await run("hello", {
    activeBot: engineering,
    mainBotId: "chief-of-staff",
  });
  assert.equal(out.text, "just text\n@delegate Security: x");
  assert.equal(out.crew, undefined);
  assert.equal(calls.chatCalls.length, 1);
});

test("the failover marker from the server is passed through", async () => {
  globalThis.fetch = (async () =>
    Response.json({
      provider: "router",
      text: "hi",
      failover: { fromModel: "a", toModel: "b", reason: "503" },
    })) as typeof fetch;
  const out = await run("hello");
  assert.deepEqual(out.failover, {
    fromModel: "a",
    toModel: "b",
    reason: "503",
  });
});

test("only the newest 40 messages, starting on a user turn, are sent", async () => {
  const calls = stub({ chat: ["ok"] });
  const history = Array.from({ length: 45 }, (_, i) => ({
    role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
    text: `m${i}`,
  }));
  history[44] = { role: "user", text: "last" };
  await run("last", { history });
  const sent = calls.chatCalls[0]?.messages ?? [];
  assert.ok(sent.length <= 40);
  assert.equal(sent[0]?.role, "user");
  assert.equal(sent[sent.length - 1]?.text, "last");
});

test("a 503 from the server shows the unconfigured-model message in both languages", async () => {
  for (const [language, text] of [
    ["en", "No model configured. Connect a model in Settings."],
    ["pt", "Nenhum modelo configurado. Conecte um modelo em Configurações."],
  ] as const) {
    stub({
      chat: [{ status: 503, body: { error: "no_provider_configured" } }],
    });
    const out = await run("hello", { language });
    assert.equal(out.text, text);
    assert.equal(out.modelCall, undefined);
  }
});

test("a provider failure becomes a described error with modelCall failed", async () => {
  stub({
    chat: [
      {
        status: 502,
        body: { error: "provider_rejected", detail: "401: bad key" },
      },
    ],
  });
  const out = await run("hello");
  assert.equal(out.text, chatCopy.en.modelErrorAuth);
  assert.equal(out.modelCall, "failed");

  globalThis.fetch = (async () => {
    throw new TypeError("offline");
  }) as typeof fetch;
  const offline = await run("hello", { language: "pt" });
  assert.equal(offline.text, chatCopy.pt.modelError);
  assert.equal(offline.modelCall, "failed");
});

test("the Chief's prompt carries the crew roster, a specialist's does not", async () => {
  const calls = stub({ chat: ["one", "two"] });
  await run("hello", { mainBotId: "chief-of-staff" });
  await run("hello", { activeBot: engineering, mainBotId: "chief-of-staff" });
  assert.match(calls.chatCalls[0]?.systemPrompt ?? "", /@delegate/);
  assert.doesNotMatch(calls.chatCalls[1]?.systemPrompt ?? "", /@delegate/);
});

test("the Chief delegates: specialists answer one at a time and the Chief synthesizes", async () => {
  const calls = stub({
    chat: [
      "On it.\n@delegate Engineering: check CI\n@delegate Security: scan",
      "CI is green",
      "no secrets",
      "final answer",
    ],
  });
  const working: string[] = [];
  const out = await run("ship it", {
    mainBotId: "chief-of-staff",
    onBotWorking: (bot) => working.push(bot.id),
  });

  assert.equal(out.text, "final answer");
  assert.equal(out.modelCall, "ok");
  assert.equal(
    out.crew?.kickoff,
    "On it.\n\nDelegating to Engineering, Security.",
  );
  assert.deepEqual(
    out.crew?.specialists.map((s) => [s.bot.id, s.text]),
    [
      ["engineering", "CI is green"],
      ["security", "no secrets"],
    ],
  );
  assert.deepEqual(working, ["engineering", "security", "chief-of-staff"]);
  assert.equal(calls.chatCalls.length, 4);
  // The synthesis call carries the history, the kickoff and the report.
  const synthesis = calls.chatCalls[3];
  assert.equal(synthesis?.messages[0]?.text, "ship it");
  assert.match(
    synthesis?.messages.at(-1)?.text ?? "",
    /### Engineering\nCI is green/,
  );
});

test("when the synthesis fails the Chief shows the synthesisFailed text", async () => {
  stub({
    chat: [
      "@delegar Engineering: do it",
      "done",
      { status: 502, body: { error: "provider_rejected", detail: "500: x" } },
    ],
  });
  const out = await run("go", { mainBotId: "chief-of-staff", language: "pt" });
  assert.equal(out.text, crewCopy.pt.synthesisFailed);
  assert.equal(out.crew?.specialists.length, 1);
});

test("a Chief reply with only an unknown delegation says the bot was not found", async () => {
  stub({ chat: ["@delegate Ghost: boo"] });
  const out = await run("go", { mainBotId: "chief-of-staff" });
  assert.equal(out.text, crewCopy.en.delegateNotFound);
  assert.equal(out.crew, undefined);
});

test("a Chief plain reply hides stray delegation lines but keeps the prose", async () => {
  stub({ chat: ["Here is my take.\n@delegate Ghost: boo"] });
  const out = await run("go", { mainBotId: "chief-of-staff" });
  assert.equal(out.text, "Here is my take.");
});

test("without a mainBotId nobody is the Chief and delegation lines are not run", async () => {
  const calls = stub({ chat: ["@delegate Engineering: x"] });
  const out = await run("go");
  assert.equal(out.text, "@delegate Engineering: x");
  assert.equal(out.crew, undefined);
  assert.equal(calls.chatCalls.length, 1);
});

test("a mentioned main bot answers as the Chief with the crew", async () => {
  const calls = stub({ chat: ["@delegate Engineering: x", "spec", "wrap"] });
  const out = await run("@Chief-of-Staff plan it", {
    activeBot: engineering,
    mainBotId: "chief-of-staff",
  });
  assert.equal(out.text, "wrap");
  assert.equal(out.delegatedBot?.id, "chief-of-staff");
  assert.equal(calls.chatCalls.length, 3);
});
