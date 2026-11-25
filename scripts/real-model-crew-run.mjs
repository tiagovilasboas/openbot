// A recorded run of the crew cases: group chat (no mention, @name, thread
// reply) and the message_bot handoff with its loop guard. It never reads,
// prints or sends a key: the model is whatever the server is configured with.
// Exit 0 = every case passed, 1 = a case failed (reason tag in the output),
// 2 = nothing could run.
//
//   OPENBOT_RUN_URL=http://127.0.0.1:3801 \
//   node --experimental-strip-types scripts/real-model-crew-run.mjs [report.md]
//   node --experimental-strip-types scripts/real-model-crew-run.mjs --dry-run
//
// --dry-run drives the real handlers with a scripted model in a temp store:
// no server, no key, no network. Prefer scripts/run-real-model.sh --crew,
// which starts the server on a throwaway data dir (the server needs
// OPENBOT_TOOLS=1 for the handoff cases).
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { buildCrewReport } from "./real-model-crew-report.mjs";
import { runCrewScenario } from "./real-model-crew-scenario.mjs";
import {
  createDryTransport,
  httpTransport,
} from "./real-model-crew-transports.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const OUT = args.find((arg) => !arg.startsWith("--"));
const BASE = (process.env.OPENBOT_RUN_URL ?? "").replace(/\/+$/, "");

if (!DRY && !BASE) {
  console.error(
    "Set OPENBOT_RUN_URL to the running server (started with OPENBOT_TOOLS=1), or pass --dry-run.",
  );
  process.exit(2);
}
if (!DRY) {
  try {
    await fetch(`${BASE}/`, { signal: AbortSignal.timeout(5000) });
  } catch (error) {
    const code = error?.cause?.code ?? error?.name ?? "unknown";
    console.error(`Cannot reach ${BASE} (${code}); nothing was run.`);
    process.exit(2);
  }
}

const { CREW_PRESETS } = await import("../src/features/bots/crew-presets.ts");
const presets = [...CREW_PRESETS];
const transport = DRY
  ? await createDryTransport(presets)
  : httpTransport(BASE, presets);
let rows;
try {
  rows = await runCrewScenario(transport);
} finally {
  transport.close();
}

const commit = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
})();
const report = buildCrewReport(rows, {
  mode: DRY
    ? "dry run (scripted model, no model was called)"
    : `real server ${BASE}`,
  commit,
  node: process.version,
});

for (const row of rows) {
  console.log(
    `${row.ok ? "ok  " : "FAIL"} ${row.name} ${row.ms} ms${row.reason ? ` [${row.reason}]` : ""} ${row.detail ?? ""}`,
  );
}
if (OUT) writeFileSync(OUT, report);
else console.log(`\n${report}`);
const failed = rows.filter((row) => !row.ok).length;
console.log(
  `\n${rows.length - failed} of ${rows.length} cases passed.${OUT ? ` Report: ${OUT}` : ""}`,
);
process.exit(failed === 0 ? 0 : 1);
