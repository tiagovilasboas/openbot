import assert from "node:assert/strict";
import test from "node:test";
import { detectSummaryRequest } from "./detect-summary-request.ts";
import { executeSummary } from "./execute-summary.ts";
import { formatSummaryPrompt } from "./format-summary-prompt.ts";
import { generateDeterministicSummary } from "./generate-deterministic-summary.ts";
import type { GitHubItem } from "../github/github-types.ts";

const sampleItems: GitHubItem[] = [
  {
    id: 101,
    number: 42,
    title: "Support model switching in UI",
    author: "developer",
    url: "https://github.com/tiagovilasboas/openbot/pull/42",
    labels: ["enhancement"],
    createdAt: "2026-11-06T12:00:00Z",
    commentsCount: 3,
    isPullRequest: true,
  },
  {
    id: 102,
    number: 43,
    title: "Investigate rate limit backoff",
    author: "reviewer",
    url: "https://github.com/tiagovilasboas/openbot/issues/43",
    labels: ["bug", "api"],
    createdAt: "2026-11-06T12:00:00Z",
    commentsCount: 1,
    isPullRequest: false,
  },
];

test("detectSummaryRequest identifies repo summary requests in PT and EN", () => {
  const pt = detectSummaryRequest(
    "Resuma as issues e PRs de tiagovilasboas/openbot",
  );
  assert.equal(pt.isSummary, true);
  if (pt.isSummary) {
    assert.equal(pt.kind, "repo_summary");
    assert.deepEqual(pt.repo, {
      owner: "tiagovilasboas",
      repo: "openbot",
    });
  }

  const en = detectSummaryRequest(
    "Give me an overview of https://github.com/facebook/react",
  );
  assert.equal(en.isSummary, true);
  if (en.isSummary) {
    assert.equal(en.kind, "repo_summary");
    assert.deepEqual(en.repo, {
      owner: "facebook",
      repo: "react",
    });
  }
});

test("detectSummaryRequest identifies daily briefing requests", () => {
  const pt = detectSummaryRequest("Quero meu briefing diário de hoje");
  assert.equal(pt.isSummary, true);
  if (pt.isSummary) {
    assert.equal(pt.kind, "daily_briefing");
  }

  const en = detectSummaryRequest("Give me the daily briefing");
  assert.equal(en.isSummary, true);
  if (en.isSummary) {
    assert.equal(en.kind, "daily_briefing");
  }
});

test("detectSummaryRequest ignores ordinary non-summary chat messages", () => {
  assert.equal(detectSummaryRequest("Olá, tudo bem?").isSummary, false);
  assert.equal(detectSummaryRequest("Como você funciona?").isSummary, false);
  assert.equal(detectSummaryRequest("").isSummary, false);
});

test("generateDeterministicSummary formats factual sections and suggested actions", () => {
  const summary = generateDeterministicSummary(
    {
      repo: { owner: "tiagovilasboas", repo: "openbot" },
      items: sampleItems,
    },
    "pt",
    "daily_briefing",
  );

  assert.match(summary, /Briefing Diário/);
  assert.match(summary, /Pull Requests: \*\*1\*\* abertos/);
  assert.match(summary, /Issues: \*\*1\*\* abertas/);
  assert.match(summary, /#42/);
  assert.match(summary, /Sugestões de Ação/);
  assert.match(summary, /Fontes: GitHub API v3/);
});

test("generateDeterministicSummary transparently reports partial failures", () => {
  const failedSummary = generateDeterministicSummary(
    {
      repo: { owner: "tiagovilasboas", repo: "openbot" },
      githubError: "rate_limited",
    },
    "pt",
    "repo_summary",
  );

  assert.match(failedSummary, /Falha Parcial/);
  assert.match(failedSummary, /Limite de requisições da API pública/);
});

test("formatSummaryPrompt includes strict factual separation instructions", () => {
  const prompt = formatSummaryPrompt(
    {
      repo: { owner: "tiagovilasboas", repo: "openbot" },
      items: sampleItems,
    },
    "pt",
    "Me dê um resumo do repo",
  );

  assert.match(
    prompt.text,
    /Separe claramente "Fatos Verificados" de "Sugestões de Ação"/,
  );
  assert.match(prompt.text, /#42: "Support model switching in UI"/);
  assert.match(prompt.text, /Me dê um resumo do repo/);
});

test("executeSummary executes deterministically when no model is configured", async () => {
  const fakeFetch: typeof fetch = async (url) => {
    if (String(url).includes("/api/github/items")) {
      return new Response(JSON.stringify({ ok: true, items: sampleItems }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  };

  const outcome = await executeSummary(
    {
      isSummary: true,
      kind: "repo_summary",
      repo: { owner: "tiagovilasboas", repo: "openbot" },
    },
    "pt",
    "Resuma o repositório",
    null,
    null,
    fakeFetch,
  );

  assert.match(outcome.text, /Resumo de tiagovilasboas\/openbot/);
  assert.equal(outcome.github?.items.length, 2);
});

test("executeSummary uses model reply when configured and falls back on error", async () => {
  const successFetch: typeof fetch = async (url) => {
    if (String(url).includes("/api/github/items")) {
      return new Response(JSON.stringify({ ok: true, items: sampleItems }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (String(url).includes("/api/chat")) {
      return new Response(
        JSON.stringify({ text: "Síntese gerada pelo modelo de IA" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("Not found", { status: 404 });
  };

  const outcome = await executeSummary(
    {
      isSummary: true,
      kind: "repo_summary",
      repo: { owner: "tiagovilasboas", repo: "openbot" },
    },
    "pt",
    "Resuma o repositório",
    null,
    {
      provider: "local",
      baseUrl: "http://localhost:11434",
      model: "llama3",
    },
    successFetch,
  );

  assert.equal(outcome.text, "Síntese gerada pelo modelo de IA");

  // Fallback test: model returns 503
  const failFetch: typeof fetch = async (url) => {
    if (String(url).includes("/api/github/items")) {
      return new Response(JSON.stringify({ ok: true, items: sampleItems }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (String(url).includes("/api/chat")) {
      return new Response(JSON.stringify({ error: "no_provider_configured" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  };

  const fallbackOutcome = await executeSummary(
    {
      isSummary: true,
      kind: "repo_summary",
      repo: { owner: "tiagovilasboas", repo: "openbot" },
    },
    "pt",
    "Resuma o repositório",
    null,
    {
      provider: "local",
      baseUrl: "http://localhost:11434",
      model: "llama3",
    },
    failFetch,
  );

  // Falls back to deterministic summary
  assert.match(fallbackOutcome.text, /Resumo de tiagovilasboas\/openbot/);
});
