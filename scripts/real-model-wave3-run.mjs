// A recorded run of the wave 3 paths against a REAL model, through a running
// Open Bot server: a routine's "Run now", POST /api/automation/run, and a crew
// turn with @mentions. It never reads, prints or sends a key: the provider is
// whatever the server is configured with. Exit 0 = every step passed, 1 = a
// step failed (reason in the output), 2 = nothing could run.
//
//   OPENBOT_RUN_URL=http://127.0.0.1:3801 \
//   node --experimental-strip-types scripts/real-model-wave3-run.mjs [report.md]
//
// Prefer `bash scripts/run-real-model.sh --wave3`: it starts the server on a
// throwaway data dir, so the bot, routine and token this run creates never
// land in ~/.openbot.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import "../src/shared/testing/register-alias-resolver.mjs";

const BASE = (process.env.OPENBOT_RUN_URL ?? "").replace(/\/+$/, "");
if (!BASE) {
  console.error("Set OPENBOT_RUN_URL to the running server.");
  process.exit(2);
}
const OUT = process.argv[2];
const HEADERS = { "content-type": "application/json", "x-openbot-client": "1" };
const TIMEOUT_MS = 150_000;
const clip = (text, n = 140) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);

const call = (path, init = {}) =>
  fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...HEADERS, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

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

const { CREW_PRESETS } = await import("../src/features/bots/crew-presets.ts");
const bots = [...CREW_PRESETS];
const chief = bots.find((bot) => bot.id === "chief-of-staff");

async function seedBots() {
  const response = await call("/api/bots", {
    method: "PUT",
    body: JSON.stringify({
      bots,
      activeBotId: chief.id,
      mainBotId: chief.id,
    }),
  });
  return response.ok;
}

/** Saves a routine that runs in its own thread, runs it, reads its history. */
function routineRunNow() {
  return timed(async () => {
    const routine = {
      id: "wave3-check",
      botId: "engineering",
      title: "Wave 3 check",
      prompt: "Reply in one short sentence confirming this routine ran.",
      schedule: { kind: "interval", everyMinutes: 60 },
      enabled: false,
      silentWhenNothingNew: false,
      runInThread: true,
    };
    const saved = await call("/api/routines", {
      method: "PUT",
      body: JSON.stringify(routine),
    });
    if (!saved.ok) return { ok: false, detail: `save HTTP ${saved.status}` };
    const run = await call("/api/routines/run?id=wave3-check", {
      method: "POST",
    });
    if (!run.ok) return { ok: false, detail: `run HTTP ${run.status}` };
    const history = await call("/api/routines/runs?id=wave3-check");
    const { runs = [] } = await history.json().catch(() => ({}));
    const latest = runs[0];
    return {
      ok: latest?.status === "succeeded" && Boolean(latest.output),
      detail: latest
        ? `${latest.status}${latest.reason ? ` (${latest.reason})` : ""}`
        : "no run in the history",
      reply: latest?.output,
    };
  });
}

/** Creates the token, calls the automation route, and checks a wrong token. */
function automationRoute() {
  return timed(async () => {
    const created = await call("/api/automation/token", { method: "POST" });
    const { token } = await created.json().catch(() => ({}));
    if (!created.ok || !token) {
      return { ok: false, detail: `token HTTP ${created.status}` };
    }
    const run = (value) =>
      call("/api/automation/run", {
        method: "POST",
        headers: { "x-openbot-automation-token": value },
        body: JSON.stringify({
          botId: "engineering",
          prompt: "Reply in one short sentence confirming you got this.",
        }),
      });
    const good = await run(token);
    const body = await good.json().catch(() => ({}));
    const bad = await run("not-the-token");
    return {
      ok: good.ok && Boolean(body.text) && bad.status === 401,
      detail: `right token HTTP ${good.status}, wrong token HTTP ${bad.status}`,
      reply: body.text ?? body.error,
    };
  });
}

/** A Chief turn naming two specialists with @mentions. */
function crewMentions() {
  return timed(async () => {
    const { executeChatMessage } =
      await import("../src/features/chat/execute-chat-message.ts");
    const realFetch = globalThis.fetch;
    globalThis.fetch = (url, init) =>
      realFetch(String(url).startsWith("/") ? `${BASE}${url}` : url, {
        ...init,
        headers: { ...(init?.headers ?? {}), "x-openbot-client": "1" },
      });
    try {
      const text =
        "@Engineering @Security give one risk of keeping data in localStorage.";
      const outcome = await executeChatMessage({
        text,
        language: "en",
        history: [{ role: "user", text }],
        activeBot: chief,
        bots,
        mainBotId: chief.id,
        gitHubToken: null,
        modelConfig: null,
        memoryFor: () => [],
        onUsage: () => {},
      });
      const asked = outcome.crew?.specialists.map((s) => s.bot.name) ?? [];
      return {
        ok: outcome.modelCall !== "failed" && asked.length === 2,
        detail: asked.length
          ? `asked ${asked.join(" and ")}${outcome.crew?.stop ? `, stopped (${outcome.crew.stop.reason})` : ""}`
          : "no crew turn happened",
        reply: outcome.text,
      };
    } finally {
      globalThis.fetch = realFetch;
    }
  });
}

try {
  await fetch(`${BASE}/`, { signal: AbortSignal.timeout(5000) });
} catch (error) {
  const code = error?.cause?.code ?? error?.name ?? "unknown";
  console.error(`Cannot reach ${BASE} (${code}); nothing was run.`);
  process.exit(2);
}
if (!(await seedBots())) {
  console.error("Could not save the bots on the server; nothing was run.");
  process.exit(2);
}

const cases = [
  ["routine Run now (own thread)", routineRunNow],
  ["automation route (token)", automationRoute],
  ["crew turn with two @mentions", crewMentions],
];
const rows = [];
for (const [name, run] of cases) {
  const result = await run();
  rows.push({ name, ...result });
  console.log(
    `${result.ok ? "ok  " : "FAIL"} ${name} ${result.ms} ms ${result.detail}`,
  );
}

const passed = rows.filter((row) => row.ok).length;
const commit = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
})();
const report = [
  "# Real model run: wave 3 paths",
  "",
  `Date: ${new Date().toISOString()}`,
  `Server: ${BASE}`,
  `Open Bot commit: ${commit}, Node ${process.version}`,
  `Result: ${passed} of ${rows.length} cases passed. A failure below is a real failure, not a simulated one.`,
  "",
  "The provider and model are whatever the server was configured with; this report carries no key or token.",
  "",
  "| Case | Result | ms | Detail | Reply (clipped) |",
  "| --- | --- | ---: | --- | --- |",
  ...rows.map(
    (row) =>
      `| ${row.name} | ${row.ok ? "ok" : "FAIL"} | ${row.ms} | ${clip(row.detail, 90)} | ${clip(row.reply, 90).replace(/\|/g, "/")} |`,
  ),
  "",
].join("\n");

if (OUT) writeFileSync(OUT, report);
console.log(
  `\n${passed} of ${rows.length} cases passed.${OUT ? ` Report: ${OUT}` : ""}`,
);
process.exit(passed === rows.length ? 0 : 1);
