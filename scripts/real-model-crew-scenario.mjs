// The crew cases: group chat and bot-to-bot handoff, written against a
// transport so the real run (HTTP to a live server) and the dry run
// (in-process, scripted provider) cannot drift apart. A transport is:
//   seed()                              -> boolean (bots and the group saved)
//   post({channelId, text, parentSeq?}) -> { status, replies, timedOut }
//   toolTurn(body)                      -> { status, events, json }
//   routines()                          -> the stored routines
//   runRoutine(id)                      -> { status, run }
import {
  decisionsFor,
  judgeApprovalPause,
  judgeApprovedResume,
  summarizeTurn,
} from "./tool-run-events.mjs";

export const CHANNEL_ID = "real-run-crew";
export const MEMBER_IDS = ["engineering", "security", "publishing"];
export const SENDER_ID = "engineering";
export const TARGET_ID = "security";
/** Ids of the routines message_bot creates (its HANDOFF_ID_PREFIX). */
export const HANDOFF_PREFIX = "m_";
export const HANDOFF_TEXT =
  "Please review the login form of our app for one common risk and reply in one sentence.";

const MESSAGE_BOT = "message_bot";
const names = (replies) => replies.map((r) => r.author.botId).join(", ");

async function timed(run) {
  const started = performance.now();
  let result;
  try {
    result = await run();
  } catch (error) {
    result = { ok: false, reason: `threw:${error?.name ?? "Error"}` };
  }
  return { ms: Math.round(performance.now() - started), ...result };
}

/** A reason when the post did not come back with a finished turn. */
function postProblem(out) {
  if (out.status !== 202) return `post_http_${out.status}`;
  if (out.timedOut) return "turn_timed_out";
  return "";
}

const anyFailed = (replies) => replies.some((r) => r.author.ok === false);

/** 1: no mention. The members decide; at most two answer, the rest stay quiet. */
async function noMention(transport) {
  const out = await transport.post({
    channelId: CHANNEL_ID,
    text: "Is a weekly planning meeting or a daily standup better for a team of five?",
  });
  const count = out.replies.length;
  const reason =
    postProblem(out) ||
    (count === 0
      ? "nobody_answered"
      : anyFailed(out.replies)
        ? "failed_answer"
        : count > 2
          ? "more_than_two_answered"
          : "");
  return {
    ok: reason === "",
    reason,
    detail: `${count} of ${MEMBER_IDS.length} members answered (${names(out.replies) || "none"}); the rest stayed quiet`,
    reply: out.replies[0]?.text,
  };
}

/** 2: @name picks the speaker, and only that one answers. */
async function mention(transport, state) {
  const out = await transport.post({
    channelId: CHANNEL_ID,
    text: "@Security give one risk of keeping session tokens in localStorage.",
  });
  const [only] = out.replies;
  const reason =
    postProblem(out) ||
    (out.replies.length === 0
      ? "nobody_answered"
      : out.replies.length > 1
        ? "more_than_one_answered"
        : only.author.botId !== TARGET_ID
          ? "wrong_speaker"
          : anyFailed(out.replies)
            ? "failed_answer"
            : "");
  if (reason === "") state.parent = only;
  return {
    ok: reason === "",
    reason,
    detail: `asked @Security; answered by ${names(out.replies) || "nobody"}`,
    reply: only?.text,
  };
}

/** 3: a thread reply goes to the author of the message it hangs on. */
async function threadReply(transport, state) {
  const parent = state.parent;
  if (!parent) return { ok: false, reason: "skipped:no_parent_message" };
  const out = await transport.post({
    channelId: CHANNEL_ID,
    parentSeq: parent.seq,
    text: "Can you give one concrete example of that?",
  });
  const [only] = out.replies;
  const reason =
    postProblem(out) ||
    (out.replies.length === 0
      ? "nobody_answered"
      : out.replies.length > 1
        ? "more_than_one_answered"
        : only.author.botId !== parent.author.botId
          ? "not_the_parent_author"
          : anyFailed(out.replies)
            ? "failed_answer"
            : "");
  return {
    ok: reason === "",
    reason,
    detail: `thread on ${parent.author.botId}'s message; answered by ${names(out.replies) || "nobody"}`,
    reply: only?.text,
  };
}

function handoffBody(language) {
  return {
    language,
    botId: SENDER_ID,
    toolsEnabled: true,
    messages: [
      {
        role: "user",
        text: `Use your ${MESSAGE_BOT} tool to send the bot named Security this exact message, word for word: "${HANDOFF_TEXT}". Then confirm in one short sentence.`,
      },
    ],
  };
}

/** Pause on the approval card, approve once, resume; reports what happened. */
async function approvedHandoff(transport, body) {
  const paused = await transport.toolTurn(body);
  if (paused.events.length === 0) return { failure: `http_${paused.status}` };
  const pause = summarizeTurn(paused.events);
  if (pause.end !== "approval_required") {
    return {
      failure: pause.toolsUnavailable ? "tools_unavailable" : "no_call",
    };
  }
  const verdict = judgeApprovalPause(pause, MESSAGE_BOT);
  if (!verdict.ok) return { failure: verdict.reason };
  const resumed = await transport.toolTurn({
    ...body,
    resume: {
      turnId: pause.approval.turnId,
      decisions: decisionsFor(pause.approval, "once"),
    },
  });
  return { resumed: summarizeTurn(resumed.events) };
}

const handoffsToTarget = async (transport) =>
  (await transport.routines()).filter(
    (r) => r.botId === TARGET_ID && r.id.startsWith(HANDOFF_PREFIX),
  );

/** 4a: the sender calls message_bot and the target answers in its thread. */
async function handoff(transport, state, language) {
  const sent = await approvedHandoff(transport, handoffBody(language));
  if (sent.failure) return { ok: false, reason: sent.failure };
  const verdict = judgeApprovedResume(sent.resumed);
  if (!verdict.ok) return { ok: false, reason: verdict.reason };
  const queued = await handoffsToTarget(transport);
  if (queued.length !== 1) return { ok: false, reason: "handoff_not_queued" };
  const [routine] = queued;
  if (!routine.runInThread) return { ok: false, reason: "not_in_thread" };
  const { run } = await transport.runRoutine(routine.id);
  state.handoffs = queued.length;
  const ok = run?.status === "succeeded" && Boolean(run.output);
  return {
    ok,
    reason: ok ? "" : `target_${run?.status ?? "no_run"}`,
    detail: `${SENDER_ID} -> ${TARGET_ID}; routine ran in its own thread (${run?.status ?? "no run"})`,
    reply: run?.output,
  };
}

/** 4b: sending the same text again is a second hop the loop guard blocks. */
async function secondHop(transport, state, language) {
  if (state.handoffs === undefined) {
    return { ok: false, reason: "skipped:no_first_handoff" };
  }
  const sent = await approvedHandoff(transport, handoffBody(language));
  if (sent.failure === "no_call") {
    return { ok: false, reason: "second_hop_not_attempted" };
  }
  if (sent.failure) return { ok: false, reason: sent.failure };
  const queued = (await handoffsToTarget(transport)).length;
  const ran = sent.resumed.toolResults.some((r) => r.ok);
  const reason = ran || queued > state.handoffs ? "second_hop_delivered" : "";
  return {
    ok: reason === "",
    reason,
    detail: `second message_bot call ${ran ? "ran" : "was refused"}; handoffs queued ${state.handoffs} -> ${queued}`,
    reply: sent.resumed.text,
  };
}

/** Runs the cases in order and returns one row per case. */
export async function runCrewScenario(transport, { language = "en" } = {}) {
  if (!(await transport.seed())) {
    return [
      { name: "seed bots and group", ms: 0, ok: false, reason: "seed_failed" },
    ];
  }
  const state = {};
  const rows = [];
  const add = async (name, run) => rows.push({ name, ...(await timed(run)) });
  await add("group, no mention: at most two answer", () =>
    noMention(transport),
  );
  await add("@name picks the speaker", () => mention(transport, state));
  await add("thread reply goes to the parent author", () =>
    threadReply(transport, state),
  );
  await add("message_bot handoff: target answers in its thread", () =>
    handoff(transport, state, language),
  );
  await add("message_bot second hop is blocked", () =>
    secondHop(transport, state, language),
  );
  return rows;
}
