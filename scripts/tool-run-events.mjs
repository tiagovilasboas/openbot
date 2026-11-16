// Pure helpers of the tools run: read the NDJSON of POST /api/chat/tools and
// judge each turn. No I/O, no keys; tool-run-events.test.mjs covers them.

/** One JSON object per line; a line that does not parse is skipped. */
export function parseNdjson(text) {
  const events = [];
  for (const line of String(text ?? "").split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // A torn line says nothing; the missing end event is judged below.
    }
  }
  return events;
}

const clip = (text, n = 120) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);

/** What a turn did, flattened for judging and for the report. */
export function summarizeTurn(events) {
  const summary = {
    text: "",
    toolCalls: [],
    toolResults: [],
    toolsUnavailable: false,
    memoryChanged: false,
    approval: null,
    failover: "",
    model: "",
    end: "none",
    errorCode: "",
  };
  for (const event of events) {
    switch (event.type) {
      case "delta":
        summary.text += event.text;
        break;
      case "tool_call":
        summary.toolCalls.push({
          name: event.name,
          policy: event.policy,
          preview: clip(event.preview, 80),
        });
        break;
      case "tool_result":
        summary.toolResults.push({
          ok: event.ok === true,
          preview: clip(event.preview, 80),
        });
        break;
      case "tools_unavailable":
        summary.toolsUnavailable = true;
        break;
      case "memory_changed":
        summary.memoryChanged = true;
        break;
      case "approval_required":
        summary.end = "approval_required";
        summary.approval = { turnId: event.turnId, calls: event.calls ?? [] };
        break;
      case "done": {
        summary.end = "done";
        summary.model = event.model ?? "";
        const f = event.failover;
        if (f) {
          summary.failover = `${f.fromModel} -> ${f.toModel}${f.reason ? ` (${clip(f.reason, 60)})` : ""}`;
        }
        break;
      }
      case "error":
        summary.end = "error";
        summary.errorCode = String(event.code ?? "unknown");
        break;
      default:
        break;
    }
  }
  return summary;
}

const pass = { ok: true, reason: "" };
const fail = (reason) => ({ ok: false, reason });

/** Turn A: a read-only GitHub lookup that runs without asking. */
export function judgeLookupTurn(summary, toolName) {
  if (summary.toolsUnavailable) return fail("tools_unavailable");
  if (summary.end === "error") return fail(`model_error:${summary.errorCode}`);
  if (summary.end === "approval_required") return fail("unexpected_approval");
  if (!summary.toolCalls.some((call) => call.name === toolName)) {
    return fail("no_tool_call");
  }
  if (!summary.toolResults.some((result) => result.ok)) {
    return fail("tool_failed");
  }
  if (summary.end !== "done" || !summary.text.trim()) {
    return fail("no_final_text");
  }
  return pass;
}

/** Turns B and C, first half: the turn must pause on the approval card. */
export function judgeApprovalPause(summary, toolName) {
  if (summary.toolsUnavailable) return fail("tools_unavailable");
  if (summary.end === "error") return fail(`model_error:${summary.errorCode}`);
  if (summary.end !== "approval_required" || !summary.approval) {
    return fail("no_approval_required");
  }
  if (!summary.approval.calls.some((call) => call.name === toolName)) {
    return fail("approval_for_wrong_tool");
  }
  return pass;
}

/** The resume body's decisions: one per paused call, echoing its digest. */
export function decisionsFor(approval, decision) {
  return approval.calls.map((call) => ({
    callId: call.callId,
    decision,
    argsDigest: call.argsDigest,
  }));
}

/** Resume with "once": the tool ran and the bot answered. */
export function judgeApprovedResume(summary) {
  if (summary.end === "error") return fail(`model_error:${summary.errorCode}`);
  if (!summary.toolResults.some((result) => result.ok)) {
    return fail("tool_not_run");
  }
  if (summary.end !== "done" || !summary.text.trim()) {
    return fail("no_final_text");
  }
  return pass;
}

/** Resume with "deny": the tool must not have run. The reply text may vary. */
export function judgeDeniedResume(summary) {
  if (summary.end === "error") return fail(`model_error:${summary.errorCode}`);
  if (summary.toolResults.some((result) => result.ok)) {
    return fail("tool_ran_after_deny");
  }
  return pass;
}

/** The notes count from a GET /api/memory?botId= body; -1 when malformed. */
export function noteCount(body) {
  return Array.isArray(body?.entries) ? body.entries.length : -1;
}
