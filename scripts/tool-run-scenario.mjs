// The tools scenario: the same steps against any transport, so the real run
// (HTTP to a live server) and the dry run (in-process, scripted provider)
// cannot drift apart. A transport is:
//   turn(body)       -> { status, events, json }   POST /api/chat/tools
//   memory(botId)    -> body of GET /api/memory?botId=
import {
  decisionsFor,
  judgeApprovalPause,
  judgeApprovedResume,
  judgeDeniedResume,
  judgeLookupTurn,
  noteCount,
  summarizeTurn,
} from "./tool-run-events.mjs";

export const GITHUB_TOOL = "github_list_open_items";
export const MEMORY_TOOL = "memory_add_note";

const PROMPTS = {
  lookup:
    "List the open issues and pull requests of the public GitHub repository tiagovilasboas/openbot using your GitHub tool, then summarize them in two short sentences.",
  approve:
    "Please remember this preference: I like answers in short bullet points. Save it as a memory note using your tool.",
  deny: "Please remember this other preference: I prefer metric units. Save it as a memory note using your tool.",
};

const clip = (text, n = 140) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);

function describe(summary) {
  const calls = summary.toolCalls.map((c) => c.name).join(",") || "none";
  const results = summary.toolResults.map((r) => (r.ok ? "ok" : "fail"));
  return `end=${summary.end}, tool_call=${calls}, tool_result=${results.join(",") || "none"}, tools_unavailable=${summary.toolsUnavailable}`;
}

/** One step: runs, judges, never throws; a thrown error becomes a tag. */
async function step(name, run) {
  const started = performance.now();
  let result;
  try {
    result = await run();
  } catch (error) {
    result = {
      ok: false,
      reason: `threw:${error?.name ?? "Error"}`,
      detail: "",
    };
  }
  return { name, ms: Math.round(performance.now() - started), ...result };
}

const skipped = (name, because) => ({
  name,
  ms: 0,
  ok: false,
  reason: `skipped:${because}`,
  detail: "",
});

/** Sends one turn; a non-NDJSON answer (HTTP error) fails with its status. */
async function sendTurn(transport, body) {
  const out = await transport.turn(body);
  if (out.events.length === 0) {
    const code = clip(out.json?.error, 40);
    return { failure: `http_${out.status}${code ? `:${code}` : ""}` };
  }
  return { summary: summarizeTurn(out.events) };
}

function reportTurn(sent, judge) {
  if (sent.failure) return { ok: false, reason: sent.failure, detail: "" };
  const verdict = judge(sent.summary);
  return {
    ...verdict,
    detail: describe(sent.summary),
    reply: clip(sent.summary.text),
    failover: sent.summary.failover,
    model: sent.summary.model,
    summary: sent.summary,
  };
}

/** Pause on the approval card, resume with a decision, then read the notes. */
async function approvalFlow(transport, base, label, decision, before) {
  const pause = await step(`${label}: pause for approval`, async () =>
    reportTurn(await sendTurn(transport, base), (s) =>
      judgeApprovalPause(s, MEMORY_TOOL),
    ),
  );
  if (!pause.ok) {
    return [
      pause,
      skipped(`${label}: resume with ${decision}`, "pause"),
      skipped(`${label}: notes after`, "pause"),
    ];
  }
  const judge = decision === "deny" ? judgeDeniedResume : judgeApprovedResume;
  const resume = await step(`${label}: resume with ${decision}`, async () => {
    const { approval } = pause.summary;
    const resumeBody = {
      ...base,
      resume: {
        turnId: approval.turnId,
        decisions: decisionsFor(approval, decision),
      },
    };
    return reportTurn(await sendTurn(transport, resumeBody), judge);
  });
  const notes = await step(`${label}: notes after`, async () => {
    const count = noteCount(await transport.memory(base.botId));
    const expected = decision === "deny" ? before : before + 1;
    const ok = count === expected;
    return {
      ok,
      reason: ok
        ? ""
        : decision === "deny"
          ? "note_added_after_deny"
          : "note_missing",
      detail: `notes ${before} -> ${count}`,
      count,
    };
  });
  return [pause, resume, notes];
}

/** Runs turns A, B and C and returns every step, in order. */
export async function runToolScenario(
  transport,
  { language = "en", botId = `real-run-tools-${Date.now().toString(36)}` } = {},
) {
  const turnBody = (key) => ({
    language,
    botId,
    toolsEnabled: true,
    messages: [{ role: "user", text: PROMPTS[key] }],
  });
  const steps = [];
  steps.push(
    await step("A: lookup (github_list_open_items)", async () =>
      reportTurn(await sendTurn(transport, turnBody("lookup")), (s) =>
        judgeLookupTurn(s, GITHUB_TOOL),
      ),
    ),
  );
  const start = noteCount(await transport.memory(botId).catch(() => null));
  const before = Math.max(start, 0);
  const approved = await approvalFlow(
    transport,
    turnBody("approve"),
    "B",
    "once",
    before,
  );
  steps.push(...approved);
  const afterB = Math.max(approved[2].count ?? before, 0);
  steps.push(
    ...(await approvalFlow(transport, turnBody("deny"), "C", "deny", afterB)),
  );
  return steps;
}
