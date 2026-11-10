// A recorded run against a REAL model, through a running Open Bot server.
// It never reads, prints or sends a key: the provider is whatever the server
// is configured with (see README, "Choose a model"). Nothing here is mocked,
// and a failure is written down as a failure.
//
//   OPENBOT_RUN_URL=http://localhost:3801 \
//   node --experimental-strip-types scripts/real-model-run.mjs docs/spikes/real-model-run.md
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import "../src/shared/testing/register-alias-resolver.mjs";

const BASE = (process.env.OPENBOT_RUN_URL ?? "").replace(/\/+$/, "");
if (!BASE) {
  console.error(
    "Set OPENBOT_RUN_URL to the running server, e.g. http://localhost:3801",
  );
  process.exit(2);
}
const OUT = process.argv[2];
const HEADERS = { "content-type": "application/json", "x-openbot-client": "1" };
const clip = (text, n = 140) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);

const PROMPT = {
  pt: "Responda em uma frase curta confirmando que você leu esta mensagem.",
  en: "Reply in one short sentence confirming you read this message.",
};

async function timed(run) {
  const started = performance.now();
  try {
    return { ...(await run()), ms: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      ok: false,
      detail: `threw ${error?.name ?? "Error"}`,
      ms: Math.round(performance.now() - started),
    };
  }
}

async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  return response;
}

async function plainChat(language, extra = {}) {
  return timed(async () => {
    const response = await post("/api/chat", {
      language,
      messages: [{ role: "user", text: PROMPT[language] }],
      ...extra,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        detail: `HTTP ${response.status} ${clip(json.error)}`,
      };
    }
    return {
      ok: Boolean(json.text),
      detail: `${json.provider ?? "?"} / ${json.model ?? "model not reported"}`,
      reply: clip(json.text),
      usage: json.usage ? JSON.stringify(json.usage) : "none reported",
      failover: json.failover
        ? `${json.failover.fromModel} -> ${json.failover.toModel}`
        : "",
    };
  });
}

async function streamChat(language) {
  return timed(async () => {
    const started = performance.now();
    const response = await post("/api/chat/stream", {
      language,
      messages: [{ role: "user", text: PROMPT[language] }],
    });
    if (!response.ok || !response.body) {
      const json = await response.json().catch(() => ({}));
      return {
        ok: false,
        detail: `HTTP ${response.status} ${clip(json.error)}`,
      };
    }
    const decoder = new TextDecoder();
    let buffer = "";
    let firstDelta = null;
    let deltas = 0;
    let text = "";
    let last = null;
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        if (event.type === "delta") {
          deltas += 1;
          text += event.text;
          firstDelta ??= Math.round(performance.now() - started);
        } else {
          last = event;
        }
      }
    }
    const ended = last?.type ?? "no final event";
    return {
      ok: ended === "done" && text.length > 0,
      detail: `${ended}${last?.code ? ` ${last.code}` : ""}, ${deltas} deltas, first delta ${firstDelta ?? "never"} ms`,
      reply: clip(text),
      usage: last?.usage ? JSON.stringify(last.usage) : "none reported",
    };
  });
}

async function delegation(language) {
  const { CREW_PRESETS } = await import("../src/features/bots/crew-presets.ts");
  const { executeChatMessage } =
    await import("../src/features/chat/execute-chat-message.ts");
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) =>
    realFetch(
      typeof input === "string" && input.startsWith("/")
        ? `${BASE}${input}`
        : input,
      {
        ...init,
        headers: { ...(init?.headers ?? {}), "x-openbot-client": "1" },
      },
    );
  try {
    const bots = [...CREW_PRESETS];
    const chief = bots.find((bot) => bot.id === "chief-of-staff");
    const text =
      language === "pt"
        ? "Peça ao bot de Engenharia um risco de guardar dados no localStorage e resuma."
        : "Ask the Engineering bot for one risk of keeping data in localStorage and summarize it.";
    return await timed(async () => {
      const outcome = await executeChatMessage({
        text,
        language,
        history: [{ role: "user", text }],
        activeBot: chief,
        bots,
        mainBotId: chief.id,
        gitHubToken: null,
        modelConfig: null,
        memoryFor: () => [],
        onUsage: () => {},
      });
      const steps = outcome.crew?.specialists.length ?? 0;
      return {
        ok: outcome.modelCall !== "failed" && outcome.text.length > 0,
        detail:
          steps > 0
            ? `delegated to ${steps} specialist(s)`
            : "no delegation happened",
        reply: clip(outcome.text),
        failover: outcome.failover
          ? `${outcome.failover.fromModel} -> ${outcome.failover.toModel}`
          : "",
      };
    });
  } finally {
    globalThis.fetch = realFetch;
  }
}

async function suggestSkill(language) {
  const lines =
    language === "pt"
      ? [
          "Resuma este PR em 3 pontos",
          "Resuma este PR em 3 pontos para o time",
          "Resuma o PR, riscos primeiro",
          "Resuma este PR em 3 pontos de novo",
          "Resuma o PR em 3 pontos com riscos",
        ]
      : [
          "Summarize this PR in 3 points",
          "Summarize this PR in 3 points for the team",
          "Summarize the PR, risks first",
          "Summarize this PR in 3 points again",
          "Summarize the PR in 3 points with risks",
        ];
  return timed(async () => {
    const response = await post("/api/skills/suggest", {
      language,
      messages: lines,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        detail: `HTTP ${response.status} ${clip(json.error)}`,
      };
    }
    const skill = json.skill ?? {};
    return {
      ok: Boolean(skill.name && skill.instructions),
      detail: `draft "${clip(skill.name, 40)}" ${skill.command ?? ""}`,
      reply: clip(skill.instructions),
    };
  });
}

function version(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

// Without a reachable server every case would "fail" for a reason that says
// nothing about the model, so stop here and write no report.
try {
  await fetch(`${BASE}/`, { method: "GET", signal: AbortSignal.timeout(5000) });
} catch (error) {
  const code = error?.cause?.code ?? error?.name ?? "unknown";
  console.error(
    `Cannot reach ${BASE} (${code}). Start the server first and check the port; nothing was run and no report was written.`,
  );
  process.exit(2);
}

const cases = [];
for (const language of ["pt", "en"]) {
  cases.push([language, "chat (/api/chat)", () => plainChat(language)]);
  cases.push([
    language,
    "stream (/api/chat/stream)",
    () => streamChat(language),
  ]);
  cases.push([
    language,
    "failover (bad per-bot model id)",
    () => plainChat(language, { modelId: "openbot/does-not-exist" }),
  ]);
  cases.push([
    language,
    "delegation (Chief to a specialist)",
    () => delegation(language),
  ]);
  cases.push([language, "suggest a skill", () => suggestSkill(language)]);
}

const rows = [];
for (const [language, name, run] of cases) {
  const result = await run();
  rows.push({ language, name, ...result });
  console.log(
    `${result.ok ? "ok  " : "FAIL"} ${language} ${name} ${result.ms} ms ${result.detail}`,
  );
}

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const passed = rows.filter((row) => row.ok).length;
const report = [
  "# Real model run",
  "",
  `Date: ${new Date().toISOString()}`,
  `Server: ${BASE}`,
  `Open Bot commit: ${version("git", ["rev-parse", "--short", "HEAD"])}, Next ${pkg.dependencies.next}, Node ${process.version}`,
  `Result: ${passed} of ${rows.length} cases passed. A failure below is a real failure, not a simulated one.`,
  "",
  "The provider and model are whatever the server was configured with; this report carries no key or token.",
  "A value in the Failover column means the configured model did not answer and the fallback did, so that reply is not the configured model's. A case counts as ok when it returned text; it does not judge quality or language.",
  "",
  "| Lang | Case | Result | ms | Detail | Usage | Failover | Reply (clipped) |",
  "| --- | --- | --- | ---: | --- | --- | --- | --- |",
  ...rows.map(
    (row) =>
      `| ${row.language} | ${row.name} | ${row.ok ? "ok" : "FAIL"} | ${row.ms} | ${clip(row.detail, 90)} | ${row.usage ?? ""} | ${row.failover ?? ""} | ${clip(row.reply, 90).replace(/\|/g, "/")} |`,
  ),
  "",
].join("\n");

if (OUT) writeFileSync(OUT, report);
console.log(
  `\n${passed} of ${rows.length} cases passed.${OUT ? ` Report: ${OUT}` : ""}`,
);
process.exit(passed === rows.length ? 0 : 1);
