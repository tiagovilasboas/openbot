// Transports for the crew scenario. Both build on one `call(method, path,
// body)` function, so the scenario sees the same answers either way:
//   httpTransport(base)   a live server; the model is whatever it is set to
//   createDryTransport()  the real route handlers in-process, a temp store and
//                         a SCRIPTED model: no server, no key, no network
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../src/shared/testing/register-alias-resolver.mjs";
import {
  CHANNEL_ID,
  HANDOFF_TEXT,
  MEMBER_IDS,
  SENDER_ID,
  TARGET_ID,
} from "./real-model-crew-scenario.mjs";
import { parseNdjson } from "./tool-run-events.mjs";

const POLL_MS = 1_000;
const TURN_TIMEOUT_MS = 150_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The channel the cases post in: three presets, the first one leads. */
const channelBody = {
  id: CHANNEL_ID,
  name: "Real run group",
  memberBotIds: MEMBER_IDS,
  leaderBotId: SENDER_ID,
  instructions: "",
};

const json = (out) => {
  try {
    return JSON.parse(out.text || "{}");
  } catch {
    return {};
  }
};

/**
 * `call` -> { status, contentType, text }. `settle(channelId)` resolves when
 * the group's background turn is over and returns true if it timed out.
 */
function makeTransport(call, settle, presets) {
  const messagesPath = (parentSeq) =>
    `/api/crew/channels/messages?channelId=${CHANNEL_ID}${parentSeq ? `&parentSeq=${parentSeq}` : ""}`;
  return {
    async seed() {
      const bots = await call("PUT", "/api/bots", {
        bots: presets,
        activeBotId: "chief-of-staff",
        mainBotId: "chief-of-staff",
      });
      const channel = await call("PUT", "/api/crew/channels", channelBody);
      return bots.status === 200 && channel.status === 200;
    },
    async post({ channelId, text, parentSeq }) {
      const out = await call("POST", "/api/crew/channels/messages", {
        channelId,
        text,
        ...(parentSeq ? { parentSeq } : {}),
      });
      const post = json(out).messages?.[0];
      if (out.status !== 202 || !post) {
        return { status: out.status, replies: [], timedOut: false };
      }
      const timedOut = await settle();
      const listed = json(await call("GET", messagesPath(parentSeq)));
      const replies = (listed.messages ?? []).filter(
        (m) =>
          m.seq > post.seq &&
          m.author?.kind === "member" &&
          m.parentSeq === parentSeq,
      );
      return { status: out.status, replies, timedOut };
    },
    async toolTurn(body) {
      const out = await call("POST", "/api/chat/tools", body);
      const ndjson = out.contentType.includes("ndjson");
      return {
        status: out.status,
        events: ndjson ? parseNdjson(out.text) : [],
        json: ndjson ? undefined : json(out),
      };
    },
    async routines() {
      return json(await call("GET", "/api/routines")).routines ?? [];
    },
    async runRoutine(id) {
      const out = await call("POST", `/api/routines/run?id=${id}`);
      return { status: out.status, run: json(out).run };
    },
    close() {},
  };
}

/** A live server: polls the group until its turn is over. */
export function httpTransport(base, presets) {
  const headers = {
    "content-type": "application/json",
    "x-openbot-client": "1",
  };
  async function call(method, path, body) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(TURN_TIMEOUT_MS),
    });
    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      text: await response.text(),
    };
  }
  async function settle() {
    const deadline = Date.now() + TURN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_MS);
      const listed = json(
        await call(
          "GET",
          `/api/crew/channels/messages?channelId=${CHANNEL_ID}`,
        ),
      );
      if (!listed.turn) return false;
    }
    return true;
  }
  return makeTransport(call, settle, presets);
}

const sse = (text) =>
  new Response(
    [
      `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
      "data: [DONE]\n\n",
    ].join(""),
    { headers: { "content-type": "text/event-stream" } },
  );

/** The scripted group model: the picker names two, Security sits one out. */
function scriptedGroupModel(call) {
  if (!call.speaker) return { ok: true, text: "Engineering, Security" };
  const quiet =
    call.speaker.id === TARGET_ID &&
    call.messages.some((m) => /weekly planning/.test(m.text)) &&
    !call.messages.some((m) => /@Security/.test(m.text));
  return quiet
    ? { ok: true, text: "[[skip]]" }
    : { ok: true, text: `Scripted answer from ${call.speaker.name}.` };
}

/** Calls message_bot whenever the prompt asks for it, then answers. */
function scriptedToolFetch(toolCallSse) {
  return async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const afterTool = body.messages.some((m) => m.role === "tool");
    if (!afterTool && body.tools?.length) {
      const call = {
        id: "dry-handoff",
        name: "message_bot",
        args: { target: "Security", text: HANDOFF_TEXT },
      };
      return new Response(toolCallSse([call]).join(""), {
        headers: { "content-type": "text/event-stream" },
      });
    }
    return sse("Done (scripted reply).");
  };
}

/** The real handlers in-process; see the header for what is scripted. */
export async function createDryTransport(presets) {
  const { openLocalStore } =
    await import("../src/shared/local-store/local-store.ts");
  const bots = await import("../src/features/bots/server/bots-handler.ts");
  const botsRepo =
    await import("../src/features/bots/server/bots-repository.ts");
  const channels =
    await import("../src/features/crew/channel/server/channels-handler.ts");
  const messages =
    await import("../src/features/crew/channel/server/channel-messages-handler.ts");
  const routines =
    await import("../src/features/routines/server/routines-handler.ts");
  const { handleToolTurn } =
    await import("../src/features/tools/server/tool-turn-handler.ts");
  const { toolCallSse } =
    await import("../src/features/tools/server/tool-turn-fixtures.ts");
  const { createStreamSlots } =
    await import("../src/features/server-guard/stream-slots.ts");

  const dir = mkdtempSync(join(tmpdir(), "openbot-crew-dry-"));
  const db = openLocalStore(dir);
  const pending = [];
  const config = {
    provider: "router",
    baseUrl: "https://93.184.216.34/v1",
    model: "dry/scripted",
  };
  const toolOptions = {
    env: { OPENBOT_TOOLS: "1" },
    db,
    fetchImpl: scriptedToolFetch(toolCallSse),
    slots: createStreamSlots({ perClient: 5, global: 10 }),
    capabilityOf: async () => "native",
  };
  const postDeps = {
    bots: () => botsRepo.listBots(db),
    language: () => "en",
    askModel: async (call) => scriptedGroupModel(call),
    schedule: (work) => pending.push(work),
  };
  const runner = async () => ({
    kind: "replied",
    text: "Scripted handoff answer.",
  });

  async function route(method, path, body) {
    const request = new Request(`http://localhost${path}`, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const { pathname } = new URL(request.url);
    if (pathname === "/api/bots") return bots.handlePutBots(request, db);
    if (pathname === "/api/crew/channels") {
      return channels.handleSaveChannel(request, db, () =>
        botsRepo.listBots(db).map((b) => b.id),
      );
    }
    if (pathname === "/api/crew/channels/messages") {
      return method === "POST"
        ? messages.handlePostMessage(request, db, postDeps)
        : messages.handleListMessages(request, db);
    }
    if (pathname === "/api/chat/tools") {
      const withConfig = new Request(request.url, {
        method,
        body: JSON.stringify({ ...body, config }),
      });
      return handleToolTurn(withConfig, toolOptions);
    }
    if (pathname === "/api/routines")
      return routines.handleListRoutines(request, db);
    return routines.handleRunNow(request, db, runner);
  }
  async function call(method, path, body) {
    const response = await route(method, path, body);
    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      text: await response.text(),
    };
  }
  async function settle() {
    await Promise.all(pending.splice(0));
    return false;
  }
  const transport = makeTransport(call, settle, presets);
  return {
    ...transport,
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
