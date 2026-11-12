import type { DatabaseSync } from "node:sqlite";
import {
  noKeyLookup,
  withVaultKeys,
} from "../../key-vault/apply-vault-keys.ts";
import { modelNotAllowedResponse } from "../../model/allowed-models.ts";
import type { ModelRequest } from "../../model/model-adapter.ts";
import { eventsToNdjson } from "../../model/ndjson-stream.ts";
import { parseChatRequest } from "../../model/parse-chat-request.ts";
import { selectAdapter } from "../../model/select-adapter.ts";
import {
  handleChatStream,
  type StreamChatOptions,
} from "../../model/stream-chat-handler.ts";
import {
  createStreamSignal,
  STREAM_TIMEOUT_MS,
} from "../../model/stream-signal.ts";
import { clientKey } from "../../server-guard/client-key.ts";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import { sharedStreamSlots } from "../../server-guard/stream-slots.ts";
import { externalDataRule } from "../../untrusted-text/wrap-external-text.ts";
import type { ToolRegistry } from "../tool-registry.ts";
import type { ToolTurnEvent } from "../tool-turn-events.ts";
import { requestDigest } from "./pending-turn-codec.ts";
import { expirePendingForBot } from "./pending-turns-repository.ts";
import {
  parseToolTurnFields,
  toolsGateOn,
  type ToolTurnFields,
} from "./parse-tool-turn.ts";
import {
  catalogCapability,
  type CapabilityLookup,
} from "./resolve-tool-capability.ts";
import { checkResume, claimTurn, recordGrants } from "./resume-turn.ts";
import { runToolTurn, type ToolTurnRun } from "./run-tool-turn.ts";
import { serverToolRegistry } from "./server-tools.ts";
import { createToolStep } from "./tool-step.ts";

export type ToolTurnOptions = StreamChatOptions & {
  db: DatabaseSync;
  tools?: ToolRegistry;
  capabilityOf?: CapabilityLookup;
  now?: () => number;
};

const NDJSON_HEADERS = {
  "content-type": "application/x-ndjson; charset=utf-8",
  "cache-control": "no-store, no-transform",
  "x-accel-buffering": "no",
};

const fail = (error: string, status: number) =>
  Response.json({ error }, { status });

/**
 * POST /api/chat/tools. Without the OPENBOT_TOOLS gate, the bot's opt-in or
 * a bot id, or on a crew turn, a new message is answered exactly as
 * /api/chat/stream does, since the client cannot see the server env; a
 * resume is refused. Otherwise it runs the tool loop as an NDJSON stream
 * (see tool-turn-events.ts). Origin, token, rate and size checks run in the
 * proxy for every /api path, as for the stream route.
 */
export async function handleToolTurn(
  request: Request,
  options: ToolTurnOptions,
): Promise<Response> {
  const text = await readBodyWithCap(
    request,
    bodyLimitFor("POST", "/api/chat/tools"),
  );
  if (text === null) return fail("payload_too_large", 413);
  let payload: unknown = null;
  try {
    payload = JSON.parse(text);
  } catch {
    // Falls through to invalid_request.
  }
  const parsed = parseToolTurnFields(payload);
  if (!parsed.ok) return fail("invalid_request", 400);
  const { fields } = parsed;
  const useTools =
    toolsGateOn(options.env) && fields.toolsEnabled && !fields.crew;
  if (useTools && fields.botId !== null) {
    return startToolTurn(request, payload, fields.botId, fields, options);
  }
  if (fields.resume) return fail("tools_disabled", 404);
  const replay = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: text,
    signal: request.signal,
  });
  return handleChatStream(replay, options);
}

/** Validates the chat request and the resume, then claims a stream slot. */
async function startToolTurn(
  request: Request,
  payload: unknown,
  botId: string,
  { resume }: ToolTurnFields,
  options: ToolTurnOptions,
): Promise<Response> {
  const { env, db, fetchImpl, keyLookup = noKeyLookup } = options;
  const parsed = parseChatRequest(payload);
  if (!parsed.ok) return fail("invalid_request", 400);
  const notAllowed = modelNotAllowedResponse(env, parsed.request.modelId);
  if (notAllowed) return notAllowed;
  const modelRequest = withVaultKeys(parsed.request, keyLookup);
  if (!selectAdapter(env, modelRequest.config, fetchImpl)) {
    return fail("no_provider_configured", 503);
  }

  const now = options.now ?? Date.now;
  const tools =
    options.tools ??
    serverToolRegistry({ db, fetchImpl, githubToken: env.GITHUB_TOKEN });
  const digest = requestDigest(
    botId,
    modelRequest.language,
    parsed.request.messages,
  );
  let resumed: ToolTurnRun["resume"] = null;
  if (resume) {
    const checked = checkResume(db, botId, resume, digest, now());
    if (!checked.ok) return fail(checked.error, checked.status);
    resumed = { request: resume, turn: checked.turn };
  } else {
    // A new message to the bot drops whatever was waiting for approval.
    expirePendingForBot(db, botId);
  }

  const slots = options.slots ?? sharedStreamSlots(env);
  const release = slots.acquire(clientKey(request.headers, env));
  if (!release) return fail("too_many_streams", 429);
  if (resumed) {
    // Of two concurrent resumes only one claims the turn, so nothing runs twice.
    if (!claimTurn(db, resumed.request, resumed.turn)) {
      release();
      return fail("turn_not_pending", 409);
    }
    recordGrants(db, botId, tools, resumed.request, resumed.turn, now());
  }
  return streamToolTurn(request, modelRequest, release, options, {
    db,
    botId,
    requestDigest: digest,
    tools,
    now,
    resume: resumed,
  });
}

type TurnBase = Omit<ToolTurnRun, "step" | "notices" | "signal">;

/** Opens the stream: deadline, model step with fallback, loop, NDJSON. */
async function streamToolTurn(
  request: Request,
  modelRequest: ModelRequest,
  release: () => void,
  options: ToolTurnOptions,
  base: TurnBase,
): Promise<Response> {
  const { env, fetchImpl } = options;
  const lookup = options.capabilityOf ?? catalogCapability;
  const capability = await lookup(
    modelRequest.config,
    modelRequest.modelId,
  ).catch(() => "none" as const);
  const stop = new AbortController();
  const signal = createStreamSignal(
    [request.signal, stop.signal],
    options.timeoutMs ?? STREAM_TIMEOUT_MS,
  );
  // Backstop for a stream nobody reads: the deadline still frees the slot.
  if (signal.aborted) release();
  else signal.addEventListener("abort", release, { once: true });

  const notices: ToolTurnEvent[] = [];
  const rule = externalDataRule(modelRequest.language);
  const step = createToolStep({
    request: {
      ...modelRequest,
      systemPrompt: modelRequest.systemPrompt
        ? `${modelRequest.systemPrompt}\n\n${rule}`
        : rule,
    },
    primary: selectAdapter(env, modelRequest.config, fetchImpl)!,
    fallback: modelRequest.fallbackConfig
      ? selectAdapter(env, modelRequest.fallbackConfig, fetchImpl)
      : null,
    env,
    fetchImpl,
    signal,
    capability,
    onToolsUnavailable: () => notices.push({ type: "tools_unavailable" }),
  });

  async function* events(): AsyncGenerator<ToolTurnEvent> {
    try {
      yield* runToolTurn({ ...base, step, notices, signal });
    } finally {
      release();
    }
  }
  const body = eventsToNdjson(events(), () => {
    stop.abort();
    release();
  });
  return new Response(body, { headers: NDJSON_HEADERS });
}
