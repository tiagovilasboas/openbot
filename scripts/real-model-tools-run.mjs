// A recorded run of the approval-gated tool loop (POST /api/chat/tools).
// It never reads, prints or sends a key: the provider is whatever the server
// is configured with. Exit 0 when every step passed, 1 when a step failed
// (each failure carries a reason tag), 2 when nothing could run.
//
//   OPENBOT_RUN_URL=http://127.0.0.1:3801 \
//   node --experimental-strip-types scripts/real-model-tools-run.mjs [report.md]
//   node --experimental-strip-types scripts/real-model-tools-run.mjs --dry-run
//
// --dry-run drives the real route with a scripted provider in a temp store:
// no server, no network, no key. The report goes to the path given, else to
// stdout. Prefer scripts/run-real-model.sh --tools, which starts the server.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createDryTransport } from "./tool-run-dry.mjs";
import { parseNdjson } from "./tool-run-events.mjs";
import { runToolScenario } from "./tool-run-scenario.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const OUT = args.find((arg) => !arg.startsWith("--"));
const BASE = (process.env.OPENBOT_RUN_URL ?? "").replace(/\/+$/, "");
const HEADERS = { "content-type": "application/json", "x-openbot-client": "1" };
const TURN_TIMEOUT_MS = 150_000;

function httpTransport() {
  return {
    async turn(body) {
      const response = await fetch(`${BASE}/api/chat/tools`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TURN_TIMEOUT_MS),
      });
      const text = await response.text();
      const ndjson = (response.headers.get("content-type") ?? "").includes(
        "ndjson",
      );
      return {
        status: response.status,
        events: ndjson ? parseNdjson(text) : [],
        json: ndjson ? undefined : JSON.parse(text || "{}"),
      };
    },
    async memory(botId) {
      const response = await fetch(
        `${BASE}/api/memory?botId=${encodeURIComponent(botId)}`,
        { headers: HEADERS, signal: AbortSignal.timeout(10_000) },
      );
      return response.json();
    },
    close() {},
  };
}

async function reachable() {
  try {
    await fetch(`${BASE}/`, { signal: AbortSignal.timeout(5000) });
    return true;
  } catch (error) {
    const code = error?.cause?.code ?? error?.name ?? "unknown";
    console.error(
      `Cannot reach ${BASE} (${code}). Start the server first; nothing was run.`,
    );
    return false;
  }
}

if (!DRY && !BASE) {
  console.error(
    "Set OPENBOT_RUN_URL to the running server (started with OPENBOT_TOOLS=1), or pass --dry-run.",
  );
  process.exit(2);
}
if (!DRY && !(await reachable())) process.exit(2);

const transport = DRY ? await createDryTransport() : httpTransport();
let steps;
try {
  steps = await runToolScenario(transport);
} finally {
  transport.close();
}

const cell = (text) => String(text ?? "").replace(/\|/g, "/");
const failed = steps.filter((s) => !s.ok);
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
  "# Real model tools run",
  "",
  `Date: ${new Date().toISOString()}`,
  `Mode: ${DRY ? "dry run (scripted provider, no model was called)" : `real server ${BASE}`}`,
  `Open Bot commit: ${commit}, Node ${process.version}`,
  `Result: ${steps.length - failed.length} of ${steps.length} steps passed.`,
  "",
  "No key, token or request body is recorded. A Failover value means the configured model did not answer and the fallback did. A tools_unavailable reason means the model takes no native tools, so the turn ran as plain chat.",
  "",
  "| Step | Result | Reason | ms | Detail | Failover | Reply (clipped) |",
  "| --- | --- | --- | ---: | --- | --- | --- |",
  ...steps.map(
    (s) =>
      `| ${cell(s.name)} | ${s.ok ? "ok" : "FAIL"} | ${cell(s.reason)} | ${s.ms} | ${cell(s.detail)} | ${cell(s.failover)} | ${cell((s.reply ?? "").slice(0, 90))} |`,
  ),
  "",
].join("\n");

for (const s of steps) {
  console.log(
    `${s.ok ? "ok  " : "FAIL"} ${s.name} ${s.ms} ms${s.reason ? ` [${s.reason}]` : ""} ${s.detail ?? ""}`,
  );
}
if (OUT) writeFileSync(OUT, report);
else console.log(`\n${report}`);
console.log(
  `\n${steps.length - failed.length} of ${steps.length} steps passed.${OUT ? ` Report: ${OUT}` : ""}`,
);
process.exit(failed.length === 0 ? 0 : 1);
